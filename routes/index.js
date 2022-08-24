'use strict';
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
// pool credentials here
const Pool = require('pg').Pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mbsb',
    password: 'kollect1234',
    port: 5432,
});
// pool credentials ends here

//const db = require('../queries')
const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');
const Whatsapp = new WhatsappCloudAPI({
    accessToken: process.env.Meta_WA_accessToken,
    senderPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId,
    WABA_ID: process.env.Meta_WA_wabaId,
});
const EcommerceStore = require('./../utils/ecommerce_store.js');
const { json } = require('express');
let Store = new EcommerceStore();
const CustomerSession = new Map();

//Get Request for initializing whatsapp hook
router.get('/meta_wa_callbackurl', (req, res) => {
    try {
        console.log('GET: Someone is pinging me!');

        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];

        if (
            mode &&
            token &&
            mode === 'subscribe' &&
            process.env.Meta_WA_VerifyToken === token
        ) {
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        console.error({ error })
        return res.sendStatus(500);
    }
});

//end Get request for whatsapp hook

router.post('/meta_wa_callbackurl', async (req, res) => {
    try {
        //console.log(Whatsapp.parseMessage(req.body));
        let data = Whatsapp.parseMessage(req.body);
        if (data?.isMessage) {
            let incomingMessage = data.message;
            let typeOfMsg = incomingMessage.type; // extract the type of message (some are text, others are images, others are responses to buttons etc...)
            let media_url = ''; //create media url
            let recipientPhone = incomingMessage.from.phone; // extract the phone number of sender
            let recipientName = incomingMessage.from.name;
            let message_id = incomingMessage.message_id; // extract the message id
            let message_time = incomingMessage.timestamp;
            if (typeOfMsg === 'text_message') {


                let bodyOfMessage = incomingMessage.text.body;
                let messageCurrentTime = new Date().toISOString();

                //enter into message database
                //end of function entering message into database

                await Whatsapp.sendSimpleButtons({
                    message: `Hi ${recipientName}, \nWelcome to Customer Portal.\nWhat do you want to do next?`,
                    recipientPhone: recipientPhone,
                    listOfButtons: [
                        {
                            title: 'Account Enquiries',
                            id: 'see_categories',
                        },
                        {
                            title: 'Talk to Kollector',
                            id: 'speak_to_Collector',
                        },
                        {
                            title: 'Promise to Pay',
                            id: 'speak_to_human',
                        },

                    ],
                });
                console.log(`${recipientName} sent message`);
                // testing for pool query
                pool.query('INSERT INTO messages (customer_name, customer_number, message_type, message_text, created_on, message_id) VALUES ($1, $2, $3, $4, $5, $6)', [recipientName, recipientPhone, typeOfMsg, bodyOfMessage, message_time, message_id], (error, results) => {
                    if (error) {
                        throw error
                    }

                })

                // end of pool query
                console.log(data);
            }
            if (typeOfMsg === 'media_message') {
                console.log(`${recipientName} sent message`);
                let media_id = incomingMessage.image.id;
                let media_type = incomingMessage.image.mime_type;
                //geting media url 
                let requestToken = 'Bearer ' + process.env.Meta_WA_accessToken
                const config = {
                    headers: {
                        Authorization: requestToken
                    }
                };
                const url = `https://graph.facebook.com/v14.0/${media_id}`;

                let media_request = await axios.get(url, config);
                media_url = await media_request.data.url;cd 
                
                //save image
                
                //###########################################must be completed later#############################
                //console.log(incomingMessage);
                //###############################################################################################
                // testing for pool query
                await pool.query('INSERT INTO messages (customer_name, customer_number, message_type, media_id, created_on, message_id, media_type, media_url, image_binary) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [recipientName, recipientPhone, typeOfMsg, media_id, message_time, message_id, media_type, media_url, imageBinry], (error, results) => {
                    if (error) {
                        throw error
                    }

                })
                //console.log(incomingMessage.image)
            }
            if (typeOfMsg === undefined) {
                if (incomingMessage.video) {
                    console.log('video')
                    console.log(`${recipientName} sent video message`);
                    let media_id = incomingMessage.video.id;
                    let media_type = incomingMessage.video.mime_type;
                    //geting media url 
                    let requestToken = 'Bearer ' + process.env.Meta_WA_accessToken
                    const config = {
                        headers: {
                            Authorization: requestToken
                        }
                    };
                    const url = `https://graph.facebook.com/v14.0/${media_id}`;

                    let media_request = await axios.get(url, config);
                    media_url = await media_request.data.url;
                    let image = await axios.get(media_url, config);
                    //save image
                    await  fs.writeFile('logo.png', image, 'binary', function(err){
                        if (err) throw err
                        console.log('File saved.')
                    })
                    //###########################################must be completed later#############################
                    console.log(media_url);
                    //###############################################################################################
                    // testing for pool query
                    await pool.query('INSERT INTO messages (customer_name, customer_number, message_type, media_id, created_on, message_id, media_type, media_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [recipientName, recipientPhone, 'gif/video', media_id, message_time, message_id, media_type, media_url], (error, results) => {
                        if (error) {
                            throw error
                        }

                    })
                }
                if (incomingMessage.document) {
                    console.log(incomingMessage.document.mime_type)
                    console.log(`${recipientName} sent ${incomingMessage.document.mime_type} message`);
                    let media_id = incomingMessage.document.id;
                    let media_type = incomingMessage.document.mime_type;
                    //geting media url 
                    let requestToken = 'Bearer ' + process.env.Meta_WA_accessToken
                    const config = {
                        headers: {
                            Authorization: requestToken
                        }
                    };
                    const url = `https://graph.facebook.com/v14.0/${media_id}`;

                    let media_request = await axios.get(url, config);
                    media_url = await media_request.data.url;
                    let image = await axios.get(media_url, config);
                    //save image
                    //###########################################must be completed later#############################
                    console.log(media_url);
                    //###############################################################################################
                    // testing for pool query
                    await pool.query('INSERT INTO messages (customer_name, customer_number, message_type, media_id, created_on, message_id, media_type, media_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [recipientName, recipientPhone, 'document', media_id, message_time, message_id, media_type, media_url], (error, results) => {
                        if (error) {
                            throw error
                        }

                    })
                }
                console.log(incomingMessage);
            }
            if (typeOfMsg === 'simple_button_message') {
                let button_id = incomingMessage.button_reply.id;

                if (button_id === 'speak_to_Collector') {
                    await Whatsapp.sendText({
                        recipientPhone: recipientPhone,
                        message: `Please Contact our representative on following number :`,
                    });

                    await Whatsapp.sendContact({
                        recipientPhone: recipientPhone,
                        contact_profile: {
                            addresses: [
                                {
                                    city: 'Kuala Lumpur',
                                    country: 'Malaysia',
                                },
                            ],
                            name: {
                                first_name: 'Farooq',
                                last_name: 'Akram',
                            },
                            org: {
                                company: 'MBSB',
                            },
                            phones: [
                                {
                                    phone: '+60197057175',
                                },
                            ],
                        },
                    });
                }
                if (button_id === 'see_categories') {
                    let categories = await Store.getAllCategories();
                    await Whatsapp.sendSimpleButtons({
                        message: `Please Choose one of the following options.\nChoose one of them.`,
                        recipientPhone: recipientPhone,
                        listOfButtons: [
                            {
                                title: 'Due Payments & Dates',
                                id: 'see_categories',
                            },
                            {
                                title: 'Send an Inquiry',
                                id: 'speak_to_Collector',
                            },
                            {
                                title: 'Pay Now',
                                id: 'speak_to_human',
                            },

                        ]
                    });
                }
            };
        }
        return res.sendStatus(200);
    } catch (error) {
        console.error({ error })
        return res.sendStatus(500);
    }
});

let getUsersAll = (req, res) => {
    console.log("for future use")
}
module.exports = { router, getUsersAll };