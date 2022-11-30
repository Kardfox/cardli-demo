"use strict"


import { api, app } from "./urls.js"


export let CHANGES = []

export const openDb = (version) => {
    return new Promise((resolve) => {
        let openRequest = indexedDB.open("db", version)

        openRequest.onupgradeneeded = (event) => {
            let db = event.target.result
            if (db.objectStoreNames.length == 2) {
                db.deleteObjectStore("user")
                db.deleteObjectStore("cards")
            }
    
            db.createObjectStore("user", {keyPath: "id"})
            db.createObjectStore("cards", {keyPath: "id" })
        }

        openRequest.onsuccess = (event) => resolve(event.target.result)
    })
}

export const checkLogin = (db) => {
    return new Promise((resolve) => {
        let transaction = db.transaction("user", "readonly")

        transaction.objectStore("user")
                        .getAll()
                        .onsuccess = (event) => {
                            resolve(event.target.result.length > 0? event.target.result[0] : null)
                        }
    })
}

export const getUser = (db) => {
    const transaction = db.transaction("user", "readonly")

    return transaction.objectStore("user").getAll()
}

export const saveUserToDb = (db, userData) => {
    let transaction = db.transaction("user", "readwrite")

    transaction.objectStore("user").add({
        id: userData.id,
        name: userData.name,
        surname: userData.surname,
        family_id: userData.family_id
    }).onsuccess = (_) => {
        window.location.replace(app.main)
    }
}

export const getCardsFromDb = (db) => {
    const transaction = db.transaction("cards", "readonly")
    return transaction.objectStore("cards").getAll()
}

export const saveCardToDb = async (db, cardData) => {
    const transaction = db.transaction("cards", "readwrite")

    return transaction.objectStore("cards").add(cardData)
}

export const deleteCardFromDb = (db, id) => {
    const transaction = db.transaction("cards", "readwrite")

    let response = fetch(api.delete_card_by_id.replace("<id>", id), { method: "DELETE" })
    if (response.status == 408) {
        CHANGES.push(
            new Request(api.delete_card_by_id.replace("<id>", id), { method: "DELETE" })
        )
    }

    return transaction.objectStore("cards").delete(id)
}