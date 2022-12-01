import sqlite3

from .sql_params import*


class DictRow(sqlite3.Row):
    @property
    def json(self):
        return dict(self)

class SQL:
    def __init__(self):
        self.connection = sqlite3.connect("database.sqlite3", check_same_thread=False)

        self.connection.row_factory = DictRow
        self.cursor: sqlite3.Cursor = self.connection.cursor()

        check_created = self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        if not check_created.fetchall():
            with open("schema.sql") as f:
                self.connection.executescript(f.read())

    def commit(self):
        self.connection.commit()
    
    def get(self):
        return self.cursor.fetchall()

sql = SQL()