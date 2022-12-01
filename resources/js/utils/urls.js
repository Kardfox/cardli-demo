"use strict"


export const api = {
    // AUTH
    login: "/api/auth/login",
    signup: "/api/auth/signup",
    logout: "/api/auth/logout",
    // CARDS
    add_card: "/api/user/cards/",
    get_cards: "/api/user/cards/",
    get_cards_by_id: "/api/user/cards/<id>",
    change_card_by_id: "/api/user/cards/<id>",
    delete_card_by_id: "/api/user/cards/<id>",
    // FAMILY
    create_family: "/api/user/family",
    join_family: "/api/user/family",
    leave_family: "/api/user/family"
}

export const app = {
    // AUTH
    auth: "auth",
    //MAIN
    main: "/",
    account: "account",
    barcode: "barcode"
}