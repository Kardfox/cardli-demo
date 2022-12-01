import json


class Model:
    def __init__(self, **params):
        if params == None: self.raise_type_error()

        params_fields = list(params.keys())
        params_fields.sort()
        class_fields = list(self.__annotations__.keys())
        class_fields.sort()

        (params_fields == class_fields) or self.raise_type_error()

        self.__dict__ = params

    def raise_type_error(self):
        raise TypeError(f"Параметры, переданные в класс {self.__class__.__name__}, не соотвествуют его полям")

    @property
    def json(self):
        return json.dumps(self.__dict__, default=str, indent=4)

    @property
    def dict(self):
        return self.__dict__
    
    @property
    def tuple(self):
        return tuple(self.__dict__.values())
    
    @property
    def columns(self):
        return tuple(self.dict.keys())

    def __repr__(self):
        return f"{self.__class__.__name__} {self.json}"


class Users(Model):
    id: str
    name: str
    surname: str
    family_id: str
    email: str
    password: str

class Cards(Model):
    id: str
    color: int
    barcode: str
    name: str
    type: str
    user_id: str
    family_id: str

class Families(Model):
    id: str
    owner_id: str

class Tokens(Model):
    token: str
    user_id: str