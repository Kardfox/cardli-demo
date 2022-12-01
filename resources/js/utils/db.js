"use strict"


import { api, app } from "./urls.js"


export let changes = []

export function sendChanges() {
    changes.forEach(element => fetch(element))
}

export function openDb(version) {
    return new Promise((resolve) => {
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
    return new Promise((resolve) => {
        let transaction = db.transaction("user", "readonly")

        transaction.objectStore("user")
                        .getAll()
                        .onsuccess = event => {
                            resolve(event.target.result.length > 0? event.target.result[0] : null)
                        }
    })
}

export function getUser(db) {
    return new Promise((resolve) => {
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
    }).onsuccess = (_) => {
        window.location.replace(app.main)
    }

    getCardsFromDb(db).then(cards => {
        cards.forEach(card => {
            fetch(api.add_card, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(card)
            })
        })
    })
}

export function getCardsFromDb(db) {
    return new Promise((resolve) => {
        const transaction = db.transaction("cards", "readonly")
        const request = transaction.objectStore("cards").getAll()

        request.onsuccess = event => resolve(event.target.result)
    })
}

export function saveCardToDb(db, cardData) {
    return new Promise((resolve) => {
        const transaction = db.transaction("cards", "readwrite")
        const request = transaction.objectStore("cards").add(cardData)

        request.onsuccess = event => resolve(event.target.result)
    })
}

export function deleteCardFromDb(db, id) {
    const transaction = db.transaction("cards", "readwrite")
    const request = transaction.objectStore("cards").delete(id)

    const response = fetch(api.delete_card_by_id.replace("<id>", id), { method: "DELETE" })
    response.then(() => {
        if (response.status == 408) {
            changes.push(
                new Request(api.delete_card_by_id.replace("<id>", id), { method: "DELETE" })
            )
        }

        request.onsuccess = event => resolve(event.target.result)
    })
}