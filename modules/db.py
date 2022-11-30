import sqlite3

from .sql_params import*


class DictRow(sqlite3.Row):
    @property
    def json(self):
        return dict(self)

class SQL:
    def __init__(self):
        self.connection = sqlite3.connect("database.db", check_same_thread=False)
        # with open("schema.sql") as f:
        #     self.connection.executescript(f.read())
        self.connection.row_factory = DictRow

        self.cursor: sqlite3.Cursor = self.connection.cursor()

    def commit(self):
        self.connection.commit()
    
    def get(self):
        return self.cursor.fetchall()

sql = SQL()