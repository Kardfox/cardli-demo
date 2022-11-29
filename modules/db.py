import pymysql
import pymysql.cursors as cursors

from .sql_params import*


class SQL(pymysql.connect):
    def __init__(self):
        super().__init__(
            user        = DB_USER,
            password    = DB_PASSWORD,
            host        = DB_HOST,
            port        = DB_PORT,
            db          = DATABASE,
            cursorclass = cursors.DictCursor,
            autocommit  = True
        )
        self.cursor: cursors.DictCursor = self.cursor()

sql = SQL()
