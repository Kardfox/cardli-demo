import {
    openDb,
    saveCardToDb,
    deleteCardFromDb,
    getCardsFromDb,
    checkLogin,
    getUser
} from "./utils/db.js"

import {
    api,
    app
} from "./utils/urls.js"

const addNewCard = (data) => {
    const saveCard = () => {
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

        saveCardToDb(db, cardData)
        .then(() => {
            modal.attr("hidden", true)
            scanBarCode.attr("hidden", false)
            addNewCard.attr("hidden", true)
            showCards()
        })

        fetch(api.add_card, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cardData)
        })
    }

    const modal       = $("#modalScanWindow"),
          addNewCard  = $("#addNewCard"),
          scanBarCode = $("#scanBarCode")

    $("#scanBarCode").attr("hidden", true)
    addNewCard.attr("hidden", false)

    const [newCardName, newCardColor, addNewCardButton] = addNewCard.find(":input")
    addNewCardButton.onclick = saveCard
}

const scanBarCode = async () => {
    const cancelSending = () => {
        if (stream) stream.getTracks().forEach(track => track.stop())
        send = false
    }

    const takePicture = async () => {
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
                video.hide()
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
}

const showCards = () => { 
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
        deleteCardFromDb(db, event.target.parentElement.dataset.id)
        .onsuccess = showCards
    }

    const cardsContainer = $("#cardsContainer")

    getCardsFromDb(db)
    .onsuccess = (event) => {
        cardsContainer.empty()
        let cards = event.target.result

        if (!cards.length) {
            cardsContainer.append(
                "<h3 id='cardsInfo'>У вас пока нет карточек</h3>"
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
    }
}

//  CARDS
let db
openDb(1).then((openedDb) => {
    db = openedDb

    initAuth()
    showCards()
})
$("#addCard").click(scanBarCode)

//  MENU
const menuModal = $("#menuModal")

const showMenu = () => menuModal.removeAttr("hidden")
const hideMenu = () => menuModal.attr("hidden", true)

const sync = async (db) => {
    const response = await fetch(api.get_all_cards)
    let newCards = await response.json()
    newCards.personal.forEach((element) => {
        saveCardToDb(db, element)
    })
    showCards()
}

$("#menuIcon").click(showMenu)
$("#backIcon").click(hideMenu)

const initAuth = () => {
    checkLogin(db).then(async (login) => {
        let checkInet = await fetch(api.get_all_cards)

        if (login) {
            getUser(db).onsuccess = event => {
                $("#username").text(event.target.result[0].name)
            }; logged()
        } else {
            notLogged()
        }

        if (checkInet.status == 408) {
            $(".menuItem").hide()
            $("#menuTitle").text("Нет подключения")
        }
    })
}

const logged = async () => {
    $("#syncButton").click(() => {
        hideMenu()
        sync(db)
    })
    $("#loginButton").hide()
    $("#logoutButton").click(async () => {
        if (confirm("Вы уверены, что хотите выйти из аккаунта?")) {
            let transaction = db.transaction(["user", "cards"], "readwrite")
    
            transaction.objectStore("user").clear()
            transaction.objectStore("cards").clear()
    
            await fetch(api.logout)
            window.location.replace(app.main)
        }
    })
}

const notLogged = () => {
    $("#syncButton").hide()
    $("#logoutButton").hide()
}

// SW
const registerSW = () => {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
                    .register("/sw.js")
                    .catch((error) => console.log(`Регистрация не завершена: ${error}`))
    }
}

registerSW()