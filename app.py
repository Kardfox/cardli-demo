from base64 import b64decode, b64encode
from io import BytesIO

import flask
from barcode import get
from flask_wtf.csrf import CSRFProtect
from PIL import Image
from pyzbar.pyzbar import decode
from werkzeug.exceptions import BadRequestKeyError

from modules.auth import Auth, Generator
from modules.responses import*
from modules.log import logger
from modules.db import sql
from modules.models import Cards
from pymysql import IntegrityError

app = flask.Flask(__name__, template_folder="resources/html", static_folder="resources", static_url_path="/resources")
app.secret_key = "a91113f217f65749a4b0d69bb7042a5490f706c3596598af546fde63824cb40d"

csrf = CSRFProtect(app)

#========================================================= API =========================================================

#   AUTH
@csrf.exempt
@app.post("/api/auth/login")
# REQUIRES: [email, password]
# RETURN: [
#    body:    User(id, name, surname, family_id, email, password),
#    cookies: [token]
#    errors:  [403, 404, 500]
# ]
def api_login():
    try:
        return Auth.login(**flask.request.json)

    except (TypeError, BadRequestKeyError):
        logger.warning(f"Получено: {flask.request.json}")
        return flask.Response(*BAD_REQUEST)

    except Exception as e:
        logger.error(e, exc_info=False)
        return flask.Response(*SERVER_ERROR)

@app.post("/api/auth/signup")
# REQUIRES: [name, surname, email, password]
# RETURN: [
#    User(id, name, surname, family_id, email, password),
#    cookies: [token]
#    errors:  [409, 500]
# ]
def api_signup():
    try:
        return Auth.signup(**flask.request.json)

    except (TypeError, BadRequestKeyError):
        logger.warning(f"Получено: {flask.request.json}")
        return flask.Response(*BAD_REQUEST)

    except Exception as e:
        logger.error(e, exc_info=True)
        return flask.Response(*SERVER_ERROR)

@csrf.exempt
@app.get("/api/auth/logout")
# REQUIRES: [cookies: token]
# RETURN: [
#    delete cookies,
#    errors: [400, 410, 500]
# ]
def api_logout():
    if not "token" in flask.request.cookies.keys(): return "", 400

    try:
        return Auth.logout(flask.request.cookies["token"])

    except (TypeError, BadRequestKeyError) as e:
        logger.warning(f"Получено: {flask.request.cookies}\n{e}")
        return flask.Response(*BAD_REQUEST)

    except Exception as e:
        logger.error(e, exc_info=True)
        return flask.Response(*SERVER_ERROR)

#  CARDS
@csrf.exempt
@app.get("/api/user/cards/")
# REQUIRES: [cookies: token]
# RETURN: [
#    [...Cards(id, color, barcode, image, name, type, user_id, family_id)...]
#    errors: [400, 410, 500]
# ]
def get_cards():
    if not "token" in flask.request.cookies.keys(): return "", 400

    try:
        token = Auth.check_token(flask.request.cookies["token"])
        if token == None: return flask.Response(*TOKEN_IS_DEAD)

        cards = {}

        sql.cursor.execute(f"SELECT * FROM `cards` WHERE user_id='{token.user_id}' AND family_id IS NULL")
        cards["personal"] = [card.json for card in sql.get()]

        sql.cursor.execute(f"SELECT * FROM `cards` WHERE user_id='{token.user_id}' AND family_id")
        cards["family"] = [card.json for card in sql.get()]

        return flask.jsonify(cards)

    except (TypeError, BadRequestKeyError) as e:
        logger.warning(f"Получено: {flask.request.cookies}\n{e}")
        return flask.Response(*BAD_REQUEST)

    except Exception as e:
        logger.error(e, exc_info=True)
        return flask.Response(*SERVER_ERROR)

@csrf.exempt
@app.post("/api/user/cards/")
# REQUIRES: [
#    cookies: token
#    json: id, color, barcode, image, name, type, family_id
# ]
# RETURN: [
#    errors: [400, 410, 500]
# ]
def add_card():
    if not "token" in flask.request.cookies.keys(): return "", 400

    try:
        token = Auth.check_token(flask.request.cookies["token"])
        if token == None: return flask.Response(*TOKEN_IS_DEAD)

        _json = flask.request.json
        _json["user_id"] = token.user_id

        new_card = Cards(**_json)

        sql.cursor.execute("INSERT INTO `cards` VALUES (?, ?, ?, ?, ?, ?, ?, ?)", new_card.tuple)
        sql.commit()

        sql.cursor.execute(f"SELECT * FROM `cards` WHERE user_id='{token.user_id}' AND family_id IS NULL")

        return flask.Response("", *SUCCESS)

    except IntegrityError:
        return flask.Response(*CARD_EXIST)

    except (TypeError, BadRequestKeyError) as e:
        logger.warning(f"Получено: {flask.request.cookies}\n{e}")
        return flask.Response(*BAD_REQUEST)
    
    except Exception as e:
        logger.error(e, exc_info=True)
        return flask.Response(*SERVER_ERROR)

@csrf.exempt
@app.delete("/api/user/cards/<id>")
# REQUIRES: [
#    cookies: token
#    json: id
# ]
# RETURN: [
#    errors: [410, 500]
# ]
def delete_card_by_id(id):
    if not "token" in flask.request.cookies.keys(): return "", 400

    user = Auth.check_token(flask.request.cookies["token"], return_user=True)
    if user == None: return flask.Response(*TOKEN_IS_DEAD)

    sql.cursor.execute("DELETE FROM `cards` WHERE id=? AND user_id=?", (id, user.id))

    return flask.Response("", *SUCCESS)

#========================================================= APP =========================================================
@app.get("/favicon.ico")
def return_favicon():
    return flask.send_file("favicon.png",  mimetype="image/png")

@app.get("/sw.js")
def return_sw():
    return flask.send_file("sw.js", mimetype="application/javascript")

@app.get("/")
def main():
    return flask.render_template("main.html")

@app.get("/auth")
def auth():
    return flask.render_template("auth.html")

@csrf.exempt
@app.post("/barcode")
# REQUIRES: [
#    b64image
# ]
# RETURN: []
def barcode():
    url = flask.request.data.decode()
    content = url.split(';')[1]
    image_encoded = content.split(',')[1]
    body = b64decode(image_encoded.encode('utf-8'))

    image = Image.open(BytesIO(body))

    decoded = decode(image)
    if decoded:
        barcode = decoded[0].data.decode()
        barcode_type = decoded[0].type

        barcode_raw = BytesIO()
        get(barcode_type, code=barcode).write(barcode_raw)

        return flask.jsonify({
            "id": Generator.generate_object_id(),
            "barcode": barcode,
            "type": barcode_type,
            "image": f"data:image/svg+xml;base64, {b64encode(barcode_raw.getvalue()).decode()}"
        })
    else:
        return "{}", 200