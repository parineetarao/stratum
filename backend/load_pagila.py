import os
import psycopg2
import re
import io

def load_pagila():
    database_url = os.environ.get(
        "PAGILA_DATABASE_URL",
        "postgresql://stratum_user:stratum_password@localhost:5432/stratum_db",
    )
    conn = psycopg2.connect(database_url)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("DROP SCHEMA IF EXISTS public CASCADE;")
    cur.execute("CREATE SCHEMA public;")
    cur.execute("GRANT ALL ON SCHEMA public TO stratum_user;")
    cur.execute("GRANT ALL ON SCHEMA public TO public;")

    with open('../pagila-schema.sql', 'r', encoding='utf-8') as f:
        sql = f.read()
        sql = re.sub(r'OWNER TO [a-zA-Z0-9_]+;', 'OWNER TO stratum_user;', sql)
        sql = re.sub(r'ALTER SCHEMA public OWNER TO stratum_user;', '', sql)
        cur.execute(sql)

    with open('../pagila-data.sql', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    copy_cmd = None
    data_lines = []

    for line in lines:
        if line.startswith('COPY ') and 'FROM stdin;' in line:
            copy_cmd = line.strip()
            data_lines = []
        elif line.strip() == '\\.' and copy_cmd:
            data_str = "".join(data_lines)
            cur.copy_expert(copy_cmd, io.StringIO(data_str))
            copy_cmd = None
            data_lines = []
        elif copy_cmd:
            data_lines.append(line)
        else:
            if line.strip() and not line.startswith('--'):
                cur.execute(line)

    conn.close()
    print("Pagila database loaded 100% successfully!")

if __name__ == '__main__':
    load_pagila()
