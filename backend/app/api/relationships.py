from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.connection import Connection, ConnectionType
from app.models.relationship import InferredRelationship, RelationshipStatus, ConfidenceTier
from app.models.schema_metadata import DiscoveredTable, DiscoveredColumn
from app.schemas.relationship import (
    RelationshipResponse, RelationshipDecision, RelationshipListResponse
)
from typing import Optional
from app.api.deps import get_current_user, get_optional_user, get_project_for_access, ensure_project_is_mutable
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector
from app.engine.relationship_inference import infer_relationships

router = APIRouter(prefix="/projects", tags=["Relationships"])

AUTO_ACCEPT_TIER = "high"
DISCARD_TIER = "low"

def get_connector(connection: Connection):
    if connection.connection_type == ConnectionType.postgresql:
        return PostgresConnector(connection.connection_string, source_schema=connection.source_schema or "public")
    else:
        return CSVConnector(connection.file_path)

@router.post("/{project_id}/infer-relationships", response_model=RelationshipListResponse)
def run_relationship_inference(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    connection = db.query(Connection).filter(
        Connection.project_id == project_id
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")

    discovered_tables = db.query(DiscoveredTable).filter(
        DiscoveredTable.project_id == project_id
    ).all()
    if not discovered_tables:
        raise HTTPException(status_code=400, detail="Run metadata discovery first")

    schema = []
    existing_fk_pairs = set()

    for table in discovered_tables:
        columns = db.query(DiscoveredColumn).filter(
            DiscoveredColumn.table_id == table.id
        ).all()

        col_list = []
        for col in columns:
            col_list.append({
                "name": col.column_name,
                "type": col.data_type,
                "is_primary_key": col.is_primary_key,
                "foreign_key": col.foreign_key_info
            })
            if col.foreign_key_info:
                existing_fk_pairs.add((
                    table.table_name,
                    col.column_name,
                    col.foreign_key_info["referenced_table"],
                    col.foreign_key_info["referenced_column"]
                ))

        schema.append({
            "table_name": table.table_name,
            "columns": col_list
        })

    connector = get_connector(connection)

    try:
        inferred = infer_relationships(schema, connector, existing_fk_pairs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
    finally:
        if hasattr(connector, 'dispose'):
            connector.dispose()

    db.query(InferredRelationship).filter(
        InferredRelationship.project_id == project_id
    ).delete()
    db.commit()

    saved = []
    auto_accepted_count = 0
    pending_count = 0

    for rel in inferred:
        tier = rel["confidence_tier"]

        if tier == DISCARD_TIER:
            continue

        if tier == "high":
            status = RelationshipStatus.auto_accepted
            auto_accepted_count += 1
        elif tier == "medium":
            status = RelationshipStatus.pending
            pending_count += 1

        db_rel = InferredRelationship(
            project_id=project_id,
            from_table=rel["from_table"],
            from_column=rel["from_column"],
            to_table=rel["to_table"],
            to_column=rel["to_column"],
            name_similarity_score=rel["name_similarity_score"],
            value_overlap_score=rel["value_overlap_score"],
            confidence_score=rel["confidence_score"],
            confidence_tier=ConfidenceTier(tier),
            explanation=rel["explanation"],
            status=status
        )
        db.add(db_rel)
        db.flush()
        saved.append(db_rel)

    db.commit()
    for s in saved:
        db.refresh(s)

    return RelationshipListResponse(
        project_id=project_id,
        total_inferred=len(saved),
        auto_accepted=auto_accepted_count,
        pending_review=pending_count,
        relationships=saved
    )

@router.patch("/{project_id}/relationships/{relationship_id}/decide", response_model=RelationshipResponse)
def decide_relationship(
    project_id: int,
    relationship_id: int,
    decision: RelationshipDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    relationship = db.query(InferredRelationship).filter(
        InferredRelationship.id == relationship_id,
        InferredRelationship.project_id == project_id
    ).first()
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    relationship.status = decision.status
    db.commit()
    db.refresh(relationship)
    return relationship

@router.get("/{project_id}/relationships", response_model=RelationshipListResponse)
def get_relationships(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    get_project_for_access(project_id, db, current_user.id if current_user else None)

    relationships = db.query(InferredRelationship).filter(
        InferredRelationship.project_id == project_id
    ).order_by(InferredRelationship.confidence_score.desc()).all()

    auto_accepted = sum(1 for r in relationships if r.status == RelationshipStatus.auto_accepted)
    pending = sum(1 for r in relationships if r.status == RelationshipStatus.pending)

    return RelationshipListResponse(
        project_id=project_id,
        total_inferred=len(relationships),
        auto_accepted=auto_accepted,
        pending_review=pending,
        relationships=relationships
    )
@router.post("/{project_id}/relationships/bulk-accept", response_model=RelationshipListResponse)
def bulk_accept_high_confidence(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts all pre-selected high confidence relationships in one action.
    User triggered — not automatic. Preserves human-in-the-loop principle.
    """
    project = get_project_for_access(project_id, db, current_user.id)
    ensure_project_is_mutable(project)

    relationships = db.query(InferredRelationship).filter(
        InferredRelationship.project_id == project_id,
        InferredRelationship.status == RelationshipStatus.auto_accepted
    ).all()

    for rel in relationships:
        rel.status = RelationshipStatus.accepted

    db.commit()

    all_relationships = db.query(InferredRelationship).filter(
        InferredRelationship.project_id == project_id
    ).all()

    auto_accepted = sum(1 for r in all_relationships if r.status == RelationshipStatus.auto_accepted)
    pending = sum(1 for r in all_relationships if r.status == RelationshipStatus.pending)

    return RelationshipListResponse(
        project_id=project_id,
        total_inferred=len(all_relationships),
        auto_accepted=auto_accepted,
        pending_review=pending,
        relationships=all_relationships
    )