const Imap = require('imap');
const {simpleParser} = require('mailparser');
const { Module } = require('module');
const { Stream } = require('stream');
//config for Database
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

//configuration for IMAP server email cs-portal@kollect.biz
const imapConfig = {
    user: 'cs-portal@kollect.biz', 
    password: 'K@L#eKT#12', 
    host: 'mail.automanage.biz', 
    port: 993,
    tls: true,
};
// create variable for parsed
let emailList = [];
const getEmails = () => {
    try {
      const imap = new Imap(imapConfig);
      imap.once('ready', () => {
        imap.openBox('INBOX', false, () => {
          imap.search(['UNSEEN', ['SINCE', new Date()]], (err, results) => {
            try {
                console.log(results);
                const f = imap.fetch(results, {bodies: ''});
            f.on('message', msg => {
              msg.on('body', stream => {
                simpleParser(stream, async (err, parsed) => {
                     
                 //  const {from, subject, textAsHtml, text} = parsed;
                  console.log(parsed.from.value[0].address);
                  /* Make API call to save the data */
                     
                  await pool.query('INSERT INTO messages (email_heading, email_body, email_address_sender, email_address_receiver, customer_name) VALUES ($1, $2, $3, $4, $5)', [parsed.subject, parsed.text, parsed.from.value[0].address,'cs-portal@kollect.biz', parsed.from.value[0].name], (error, results) => {
                    if (error) {
                      throw error
                    }
                    
                  })

                /* Ends Database Entry ehere */
                //email list check
                emailList = await parsed;
                });
              });
              msg.once('attributes', attrs => {
                const {uid} = attrs;
                imap.addFlags(uid, ['\\Seen'], () => {
                  // Mark the email as read after reading it
                  console.log('Marked as read!');
                });
              });
            });
            f.once('error', ex => {
              return Promise.reject(ex);
            });
            f.once('end', () => {
              console.log('Done fetching all messages!');
              imap.end();
            });
          
            } catch (err) {
                console.log('no emails to check');
            }
            });
        });
      });
  
      imap.once('error', err => {
        console.log(err);
      });
  
      imap.once('end', () => {
        console.log('Connection ended');
      });
  
      imap.connect();
    } catch (ex) {
      console.log('an error occurred');
    }
  };
  
let minutes = 1, the_interval = minutes * 60 * 1000;
setInterval( async function() {
  console.log("I am doing my 1 minute check");
  
  // do your stuff here
  if(emailList == []){
     await console.log('No New email ');
  }else{
    await getEmails();
  }
 
}, the_interval);
  
  
  