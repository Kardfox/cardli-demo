import {
    openDb,
    checkLogin,
    saveUserToDb,
    saveCardToDb
} from "./utils/db.js"

import {
    api,
    app
} from "./utils/urls.js"


let db
openDb(1).then(async (openedDb) => {
    db = openedDb
    if (await checkLogin(db) != null)
        window.location.replace(app.main)
})

const sync = async (db) => {
    const response = await fetch(api.get_cards)
    let newCards = await response.json()
    newCards.personal.forEach((element) => {
        saveCardToDb(db, element)
    })
}


const request = (body, CSRFToken) => {
    return {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": CSRFToken
        },
        body: JSON.stringify(body)
    }
}

const checkValid = inputs => {
    let valid = true
    $(".error").remove()

    inputs.forEach((element) => {
        $(element).addClass("check")
        if (!element.validity.valid) {
            warning(element, element.validationMessage)
            valid = false
        }
    })

    return valid
}

const warning = (afterNode, text) => {
    $(afterNode).after(`<p class="error">${text}</p>`)
}

const login = async () => {
    const inputs = $("#login").find(":input").toArray()
    if (!checkValid(inputs)) return

    const [csrfInput, emailInput, passwordInput, _] = inputs

    let response = await fetch(
        api.login,
        request({
            email: emailInput.value,
            password: passwordInput.value
        }, csrfInput.value)
    )

    switch (response.status) {
        case 500: case 404:
            warning(emailInput, await response.text()); break
        case 403:
            warning(passwordInput, await response.text()); break
        case 200:
            await sync(db)
            saveUserToDb(db, await response.json()); return
    }
}

const signup = async () => {
    const inputs = $("#signup").find(":input").toArray()
    if (!checkValid(inputs)) return

    const [
        csrfInput,
        nameInput,
        surnameInput,
        emailInput,
        passwordInput,
        passwordRepeatInput,
        _
    ] = inputs
    signupButton.setAttribute("disabled", true)

    if (passwordInput.value !== passwordRepeatInput.value) {
        warning(passwordInput, "Пароли не совпадают")
        warning(passwordRepeatInput, "Пароли не совпадают")
        return
    }

    let response = await fetch(
        api.signup,
        request({
            name: nameInput.value,
            surname: surnameInput.value,
            email: emailInput.value,
            password: passwordInput.value
        }, csrfInput.value)
    )

    switch (response.status) {
        case 500: case 409:
            warning(emailInput, await response.text()); break
        case 200:
            saveUserToDb(db, await response.json()); return
    }
}

$("#loginButton").click(login)
$("#signupButton").click(signup)

const switchVariant = (event) => {
    if (event.target.value == "login") {
        $("#login").css("display", "block")
        $("#signup").css("display", "none")
        return
    }

    $("#login").css("display", "none")
    $("#signup").css("display", "block")
}

$("#loginRadio").click()
$("input[type=radio][name=variant]").change(switchVariant)