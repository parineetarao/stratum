from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class ConnectionFile(Base):
    """One uploaded CSV/Excel file within a file-based Connection, mapped to
    exactly one logical table (or, for multi-sheet Excel, the base name a
    sheet's table is derived from)."""
    __tablename__ = "connection_files"
    __table_args__ = (
        UniqueConstraint("connection_id", "table_name", name="uq_connection_files_table_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("connections.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "csv" | "excel"
    table_name = Column(String, nullable=False)
    encoding = Column(String, nullable=True)
    delimiter = Column(String, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    connection = relationship("Connection", back_populates="files")
