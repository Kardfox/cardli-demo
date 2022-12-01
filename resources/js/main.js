import {
    checkLogin, deleteCardFromDb,
    getCardsFromDb, getUser, openDb,
    saveCardToDb, sendChanges
} from "./utils/db.js"

import {
    api,
    app
} from "./utils/urls.js"


//  CARDS
function addNewCard(data) {
    const modal       = $("#modalScanWindow"),
          addNewCard  = $("#addNewCard"),
          scanBarCode = $("#scanBarCode")

    $("#scanBarCode").attr("hidden", true)
    addNewCard.attr("hidden", false)

    const [newCardName, newCardColor, addNewCardButton] = addNewCard.find(":input")

    addNewCardButton.onclick = () => {
        if (newCardName.value.length <= 2) {
            $(".error").remove()
            $(newCardName).after(`<p class="error">Слишком короткое название</p>`)
            return
        }

        const cardData = {
            name: newCardName.value,
            color: newCardColor.value,
            family_id: null,
            ...data
        }

        saveCardToDb(DB, cardData)
        .then(() => {
            modal.attr("hidden", true)
            scanBarCode.attr("hidden", false)
            addNewCard.attr("hidden", true)
            showCards()
        })

        if (canSend)
            fetch(api.add_card, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cardData)
            })
    }
}

function showCards(include) { 
    const createCard = (id, name, color, src) => {
        return `
            <div class="card" style="background-color: ${color}" data-id="${id}">
                <h1 class="cardName">${name}</h1>
                <img class="barcode" src="${src}">
                <button class="deleteCardButton">Удалить</button>
            </div><br>
        `
    }

    const deleteCard = (event) => {
        deleteCardFromDb(DB, event.target.parentElement.dataset.id)
        .then(() => showCards())
    }

    const cardsContainer = $("#cardsContainer")

    getCardsFromDb(DB).then(cards => {
        if (include) {
            cards = cards.filter(element => element.name.toLocaleLowerCase().startsWith(include))
        } else {
            cards = cards.reverse()
        }

        cardsContainer.empty()

        if (!cards.length) {
            cardsContainer.append(
                "<h3 id='cardsInfo'>Пока нет карточек</h3>"
            ); return
        }

        cards.forEach(element => {
            const card         = $(createCard(element.id, element.name, element.color, element.image)),
                barcode      = card.find("img"),
                deleteButton = card.find("button")

            card.click((event) => {
                if (event.target.className == "barcode") {
                    barcode.css("visibility", "hidden")
                    deleteButton.css("visibility", "hidden")
                    return
                }

                barcode.css("visibility", "visible")
                deleteButton.css("visibility", "visible")

                deleteButton.click(deleteCard)
            })

            card.appendTo(cardsContainer)
        })
    })
}

//  BARCODE
async function scanBarCode() {
    function cancelSending() {
        if (stream) stream.getTracks().forEach(track => track.stop())
        send = false
    }

    async function takePicture() {
        if (!send) return

        const width = video.width(),
              height = video.height()

        const canvas = $("#imageCanvas")[0],
              context = canvas.getContext("2d")

        canvas.width = width
        canvas.height = height

        context.drawImage(video[0], 0, 0, width, height)

        fetch(app.barcode, {
            method: "POST",
            headers: {
                "Content-Type": "image/png",
                "X-CSRFToken": $("#csrf").val()
            },
            body: canvas.toDataURL("image/png")
        })
        .then(async (request) => {
            const json = await request.json()

            if (json.barcode) {
                cancelSending()
                addNewCard(json)
            } else if (request.status == 408) {
                alert("Вы в офлайне, некоторые функции недоступны")
                cancelSending()
                modal.hide()
            } else {
                takePicture()
                $("#barCodeInfo").text("Код не обнаружен")
            }
        })
        .catch(alert)
    }

    const video = $("#cameraStream"),
          modal = $("#modalScanWindow")

    let stream,
        send = true

    modal.removeAttr("hidden")
    let constraints = {
        video: {
            facingMode: { exact: "environment" }
        },
        audio: false
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
    } catch(error) {
        constraints.video = true
        stream = await navigator.mediaDevices.getUserMedia(constraints)
    }

    video[0].srcObject = stream

    setTimeout(takePicture, 1000)

    $("#enterBarCode").click(() => {
        const code = $("#barCodeInput").val()
        if (code.length < 4) {
            $(".error").remove()
            video.after(`<p class="error">Слишком короткий код</p>`)
            return
        }
        cancelSending()
        addNewCard($("#barCodeInput").val())
    })

    $("#cancelScan").click(() => {
        cancelSending()
        modal.attr("hidden", true)
    })
}

//  ACCOUNT
const sync = async () => {
    fetch(api.get_cards).then(async (response) => {
        let newCards = await response.json()
        newCards.personal.forEach(element => saveCardToDb(DB, element))
        showCards()
    })
}

function checkAuth() {
    checkLogin(DB).then(async (login) => {
        let check = await fetch(api.get_cards)

        if (login) {
            getUser(DB).then(user => {
                $("#username").text(user[0].name)
            })
        }

        switch (check.status) {
            case 200:
                canSend = true
                $("#syncButton").click(() => {
                    hideMenu()
                    sync(DB)
                })
                $("#loginButton").hide()
                $("#logoutButton").click(() => {
                    if (confirm("Вы уверены, что хотите выйти из аккаунта?")) {
                        let transaction = DB.transaction(["user", "cards"], "readwrite")
                
                        transaction.objectStore("user").clear()
                        transaction.objectStore("cards").clear()
                
                        fetch(api.logout).then(() => {
                            window.location.replace(app.main)
                        })
                    }
                })

                sendChanges()

                break
            case 400: case 410:
                $("#syncButton").hide()
                $("#logoutButton").hide()
                break
            case 408:
                $(".menuItem").hide()
                $("#menuTitle").text("Нет подключения")
                break
        }
    })
}

//  MAIN
let DB
let canSend = false
openDb(1).then((openedDb) => {
    DB = openedDb

    checkAuth()
    showCards()
})
$("#addCard").click(scanBarCode)

//  SEARCH
$("#searchCard").val("")
$("#searchCard").on("input", (event) => {
    const value = event.target.value.toLowerCase()
    showCards(value)
})

//  MENU
const menuModal = $("#menuModal")

const showMenu = () => menuModal.removeAttr("hidden")
const hideMenu = () => menuModal.attr("hidden", true)

$("#menuIcon").click(showMenu)
$("#backIcon").click(hideMenu)

//  SW
function registerSW() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
                    .register("/sw.js")
                    .catch((error) => console.log(`Регистрация не завершена: ${error}`))
    } else {
        alert("У вас устаревший браузер, многие функции будут недоступны")
    }
}

registerSW()