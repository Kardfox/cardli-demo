import datetime
from hashlib import sha256
from time import time

from flask import Response
from pymysql import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from .db import sql
from .models import Tokens, Users
from .responses import*


class Generator:
    def generate_token(user_id):
        today = str(datetime.datetime.today())

        hash = f"{today}-{user_id}".encode("utf-8")

        return sha256(hash).hexdigest()

    def generate_user_id():
        return str(time() % 1)[2:9]

    def generate_object_id():
        return str(time() % 1)[2:12]

    def generate_family_id(name, surname):
        return f"{name[0]}{surname[0]}{str(time() % 1)[2:6]}"


class Auth:
    def login(email, password):
        try:
            sql.cursor.execute("SELECT * FROM `users` WHERE email=%s", email)

            user = Users(**sql.cursor.fetchone())
            if check_password_hash(user.password, password):
                user.password = None

                token = Tokens(
                    token = Generator.generate_token(user.id),
                    user_id = user.id
                )

                sql.cursor.execute("""
                    INSERT INTO tokens VALUES (
                        %(token)s,
                        %(user_id)s
                    )
                """, token.dict)

                response = Response(user.json, 200, mimetype="application/json")
                response.set_cookie(
                    "token",
                    token.token,
                    httponly=True,
                    samesite="STRICT",
                    secure=True
                )

                return response

            return Response(*PASSWORD_WRONG)

        except TypeError:
            return Response(*NOT_FOUND_USER)

    def signup(name, surname, email, password):
        try:
            new_user = Users(
                id=Generator.generate_user_id(),
                name=name,
                surname=surname,
                family_id=None,
                email=email,
                password=generate_password_hash(password)
            )

            sql.cursor.execute("""
                INSERT INTO `users` VALUES (
                    %(id)s,
                    %(name)s,
                    %(surname)s,
                    %(family_id)s,
                    %(email)s,
                    %(password)s
                )
            """, new_user.dict)

            return Auth.login(email, password)

        except IntegrityError:
            return Response(*USER_EXIST)

    def logout(token):
        try:
            token = Auth.check_token(token)

            sql.cursor.execute("DELETE FROM `tokens` WHERE token=%s", token)

            response = Response("", 200)
            response.delete_cookie("token")
            response.delete_cookie("session")

            return response

        except TypeError:
            return Response(*TOKEN_IS_DEAD)

    def check_token(token, return_user=False):
        try:
            sql.cursor.execute("SELECT * FROM `tokens` WHERE token=%s", token)
            token = Tokens(**sql.cursor.fetchone())

            if return_user:
                sql.cursor.execute("SELECT * FROM `users` WHERE id=%s", token.user_id)
                return Users(**sql.cursor.fetchone())
            return token

        except TypeError:
            return None
