#!/usr/bin/env python3
"""Dependency-free SQLite evidence-index tests. Not a new DB engine."""
from pathlib import Path
from sqlite3 import connect, IntegrityError, DatabaseError
from hashlib import sha256
import json
schema=(Path(__file__).parents[1]/'db/schema.sql').read_text()
with connect(':memory:') as con:
    con.executescript(schema)
    h=lambda s:sha256(s.encode()).hexdigest()
    con.execute('INSERT INTO scenarios VALUES (?,?,?,?,?,?)',('apples','apple_label_matches_scene',h('contract'),h('fixture'),'2026-10-08T00:00:00Z','Count consistency'))
    con.execute('INSERT INTO runs VALUES (?,?,?,?,?,?,?,?,?)',('run1','apples',h('report'),h('observation'),'fail',0,1,0,'2026-10-08T00:00:01Z'))
    con.execute('INSERT INTO findings VALUES (?,?,?,?)',('run1','object_count_consistency','fail','R_MISMATCH'))
    assert con.execute('SELECT outcome FROM runs').fetchone()[0]=='fail'
    try: con.execute("UPDATE runs SET outcome='pass' WHERE run_id='run1'")
    except DatabaseError: pass
    else: raise AssertionError('unexpected mutable run')
    try: con.execute('INSERT INTO findings VALUES (?,?,?,?)',('run1','object_count_consistency','pass','R_OK'))
    except IntegrityError: pass
    else: raise AssertionError('duplicate assertion not rejected')
    try: con.execute('INSERT INTO runs VALUES (?,?,?,?,?,?,?,?,?)',('r2','missing',h('x'),h('y'),'pass',1,0,0,'2026-10-08T00:00:02Z'))
    except IntegrityError: pass
    else: raise AssertionError('foreign key not enforced')
    print('ScenarioDB SQLite schema smoke PASS: insert, evidence index, immutability, duplicate/foreign-key rejection')
