"use strict"


import { api, app } from "./urls.js"


export function sendChanges() {
    let changes = JSON.parse(localStorage.getItem("changes"))
    changes.forEach(element => fetch(element.url, element.body))
    localStorage.setItem("changes", "[]")
}

export function openDb(version) {
    return new Promise(resolve => {
        const openRequest = indexedDB.open("db", version)

        openRequest.onupgradeneeded = event => {
            const db = event.target.result
            if (db.objectStoreNames.length == 2) {
                db.deleteObjectStore("user")
                db.deleteObjectStore("cards")
            }
    
            db.createObjectStore("user", {keyPath: "id"})
            db.createObjectStore("cards", {keyPath: "id" })
        }

        openRequest.onsuccess = event => resolve(event.target.result)
    })
}

export function checkLogin(db) {
    return new Promise(resolve => {
        let transaction = db.transaction("user", "readonly")

        transaction.objectStore("user")
                        .getAll()
                        .onsuccess = event => {
                            resolve(event.target.result.length > 0? event.target.result[0] : null)
                        }
    })
}

export function getUser(db) {
    return new Promise(resolve => {
        const transaction = db.transaction("user", "readonly")
        const request = transaction.objectStore("user").getAll()

        request.onsuccess = event => resolve(event.target.result)
    })
}

export function saveUserToDb(db, userData) {
    let transaction = db.transaction("user", "readwrite")

    transaction.objectStore("user").add({
        id: userData.id,
        name: userData.name,
        surname: userData.surname,
        family_id: userData.family_id
    }).onsuccess = async () => {
        const cards = await getCardsFromDb(db)
        cards.forEach(card => {
            fetch(api.add_card, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(card)
            })
        })

        window.location.replace(app.main)
    }
}

export function getCardsFromDb(db) {
    return new Promise(resolve => {
        const transaction = db.transaction("cards", "readonly")
        const request = transaction.objectStore("cards").getAll()

        request.onsuccess = event => resolve(event.target.result)
    })
}

export function saveCardToDb(db, cardData, sync) {
    return new Promise(resolve => {
        const transaction = db.transaction("cards", "readwrite")
        const request = transaction.objectStore("cards").add(cardData)

        if (!sync) {
            fetch(api.add_card, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cardData)
            })
            .then((response) => {
                if (response.status == 408) {
                    const change =  {
                        url: api.add_card,
                        body: {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(cardData)
                        }
                    }

                    let changes = JSON.parse(localStorage.getItem("changes"))
                    changes.push(change)
                    localStorage.setItem("changes", JSON.stringify(changes))
                }
            })
        }

        request.onsuccess = event => resolve(event.target.result)
    })
}

export async function deleteCardFromDb(db, id) {
    return new Promise(resolve => {
        const transaction = db.transaction("cards", "readwrite")
        const request = transaction.objectStore("cards").delete(id)

        fetch(api.delete_card_by_id.replace("<id>", id), { method: "DELETE" })
        .then((response) => {
            if (response.status == 408) {
                const change = {
                    url: api.delete_card_by_id.replace("<id>", id),
                    body: { method: "DELETE" }
                }

                let changes = JSON.parse(localStorage.getItem("changes"))
                changes.push(change)
                localStorage.setItem("changes", JSON.stringify(changes))
            }
        })
        request.onsuccess = event => resolve(event.target.result)
    })
}