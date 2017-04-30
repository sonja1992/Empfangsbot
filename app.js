var builder = require('botbuilder')
var restify = require('restify')
var response = require('./KrankenhausBot')
var nao = require('./pservice')

// -------  Region 1 ------
// Setup Restify Server
var server = restify.createServer()
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
})

var appId = process.env.MICROSOFT_APP_ID;
var appPassword = process.env.MICROSOFT_APP_PASSWORD;

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
})


server.get('/', restify.serveStatic({
 directory: __dirname,
 default: '/index.html'
}));

var bot = new builder.UniversalBot(connector)
server.post('/api/messages', connector.listen())
//-------- Ende Region 1      

/* ------------ Region 2 ----------- */
// Create bot and bind to console
//var connector = new builder.ConsoleConnector().listen()
//var bot = new builder.UniversalBot(connector)

/* ------Ende Region 2 ------------- */

var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/a785638d-da3d-4c51-970c-d848d945ebcb?subscription-key=318cb9fe69a549e0ac7529e7d0140b37&timezoneOffset=0.0&verbose=true&q='

var recognizer = new builder.LuisRecognizer(model);
bot.dialog('/', new builder.IntentDialog({ recognizers: [recognizer] })

// Begrüßung (Intent Begrüßung --> %s wie kann ich Ihnen helfen?)
    .matches('Begrüßung', [
        
        function (session, results) {
           session.send ('Guten Tag wie kann ich Ihnen helfen?', results.response);
		}
])


//Personensuche (Intent Personensuche --> Patient (--> Intent Patient) oder Arzt (--> Intent Arzt)

	.matches('Personensuche', [
        function (session, args, next) {
            //session.send(session.message.text);

            // Entity Personenfüllwort (pfüllwortEntity) und Name (nameEntity)
			// Name Entity besteht aus mehreren Teilen!
            var pfüllwortEntity = builder.EntityRecognizer.findEntity(args.entities, 'Personenfüllwort');
            var nameEntity = builder.EntityRecognizer.findEntity(args.entities, 'Name::Nachname');
			//var anredeEntity = builder.EntityRecognizer.findEntity(args.entities, 'Name::Anrede');
			var vornameEntity = builder.EntityRecognizer.findEntity(args.entities, 'Name::Vorname');
			
            if (pfüllwortEntity) {
                session.dialogData.searchType = 'Personenfüllwort';
                next({ response: pfüllwortEntity.entity });
            }  
			else if (nameEntity  && vornameEntity) {
                session.dialogData.searchType = 'Name::Vorname';
                next({ response: vornameEntity.entity }); 
            }
			else if (nameEntity ) {
                session.dialogData.searchType = 'Name::Nachname';
                next({ response: nameEntity.entity }); 
            } else {
                builder.Prompts.text(session, 'Ich habe sie leider nicht verstanden. Können Sie das wiederholen?');
            }
        },
        function (session, results) {
            var destination = results.response;

            if (session.dialogData.searchType === 'Personenfüllwort') {
                session.send('Wen suchen Sie denn?', destination);
            } 
			else if (session.dialogData.searchType === 'Name::Vorname') {
				session.beginDialog('personenauswahl');
            }
			else if (session.dialogData.searchType === 'Name::Nachname') {
				session.beginDialog('vornamenabfrage');
            } else {
				 session.send(' Ich hoffe ich kann ihnen bei anderen Dingen helfen', destination);
			}
		}
])

// Patientensuche 
// 2 Entities: Patient und Name(Anrede, Vorname, Nachname) 
//nur Patient --> funktion wie ist der Name --> Antworten 
//Patient + Name --> direkte Antwort
	.matches('Patientensuche', [
        function (session, args, next) {
            //session.send(session.message.text);

            var patientEntity = builder.EntityRecognizer.findEntity(args.entities, 'Patient');
            var pnameEntity = builder.EntityRecognizer.findEntity(args.entities, 'Name::Nachname');
			
            if (patientEntity) {
               
                session.dialogData.searchType = 'Patient';
                next({ response: patientEntity.entity });
            }  
			//hier eigentlich Name + Patient
			else if (pnameEntity) {
               
                session.dialogData.searchType = 'Name::Nachname';
                next({ response: pnameEntity.entity }); 
            } else {
                
                builder.Prompts.text(session, 'Ich habe sie leider nicht verstanden');
            }
        },
        function (session, results) {
            var destination = results.response;

            if (session.dialogData.searchType === 'Patient') {
                session.beginDialog('patientenauswahl');
            } 
			else if (session.dialogData.searchType === 'Name::Nachname') {
                session.send('%s befindet sich im 3. Stock', destination);
			
            } else {
				 session.send('Ich habe sie leider nicht verstanden', destination);
			} 
            
		}
])

// Arztsuche
// 3 Entities: Arzt,Name(Anrede,Vorname,Nachname), Titel, Fachbereich
// nur Arzt (+ Fachbereich) --> wie ist der Name --> Antwort
// (Titel +) Name --> direkte Antwort
	.matches('Arztsuche', [
        function (session, args, next) {
            //session.send(session.message.text);

            var arztEntity = builder.EntityRecognizer.findEntity(args.entities, 'Arzt');
            var anameEntity = builder.EntityRecognizer.findEntity(args.entities, 'Name::Nachname');
			
            if (arztEntity) {
               
                session.dialogData.searchType = 'Arzt';
                next({ response: arztEntity.entity });
            }  
			//hier eigentlich Name + Patient
			else if (anameEntity) {
               
                session.dialogData.searchType = 'Name::Nachname';
                next({ response: anameEntity.entity }); 
            } else {
                
                builder.Prompts.text(session, 'Ich habe sie leider nicht verstanden');
            }
        },
        function (session, results) {
            var destination = results.response;

            if (session.dialogData.searchType === 'Arzt') {
                 session.beginDialog('arztauswahl');
            } 
			else if (session.dialogData.searchType === 'Name::Nachname') {
                session.send('%s befindet sich im 2. Stock in Zimmer 212', destination);
			
            } else {
				session.send('Ich habe sie leider nicht verstanden', destination);
			}  
            
		}
])

  .matches('Befindensabfrage', [
        
        function (session, results) {
           session.send ('Dazu darf ich Ihnen leider keine Auskunft geben. Bitte wenden Sie sich an eine Schwester oder einen Arzt.', results.response);
		}
])

// Dingsuche 
	.matches('Dingsuche', [
        function (session, args, next) {
            //session.send(session.message.text);

            var dfüllwortEntity = builder.EntityRecognizer.findEntity(args.entities, 'Dingfüllwort');
           
            if (dfüllwortEntity) {
                
                session.dialogData.searchType = 'Dingfüllwort';
                next({ response: dfüllwortEntity.entity });
            } else {
                
                builder.Prompts.text(session, 'Ich habe Sie leider nicht verstanden');
            }
        },
		
        function (session, results) {
            var destination = results.response;

            var message = '';
            if (session.dialogData.searchType === 'Dingfüllwort') {
                message += 'Was suchen Sie genau?';
            } else {
				 message += 'Ich habe Sie leider nicht verstanden';
			}

            session.send(message, destination);
            
		}
])


// Gebäudeinformation hier werden nur die Entities Fachbereich und Zimmer verwendet
// Entity Stockwerk wird vernachlässigt
// Zimmer ist aufgeteilt in Raum und Nummer!!!!
	.matches('Gebäudeinformation', [
        function (session, args, next) {
            //session.send(session.message.text);

            var zimmerEntity = builder.EntityRecognizer.findEntity(args.entities, 'Zimmer');
            var fachbereichEntity = builder.EntityRecognizer.findEntity(args.entities, 'Fachbereich');
			
            if (zimmerEntity) {
               
                session.dialogData.searchType = 'Zimmer';
                next({ response: zimmerEntity.entity });
            }  
			else if (fachbereichEntity) {
               
                session.dialogData.searchType = 'Fachbereich';
                next({ response: fachbereichEntity.entity }); 
            } else {
                
                builder.Prompts.text(session, 'Aktuell befinden wir uns im Erdgeschoss');
            }
        },
		
        function (session, results) {
            var destination = results.response;

            var message = '';
            if (session.dialogData.searchType === 'Zimmer') {
                message += '%s ist im 2. Stock rechts';
            } 
			else if (session.dialogData.searchType === 'Fachbereich') {
                message +=  '%s befindet sich im 3. Stock';
			
            } else {
				 message += 'Aktuell befinden wir uns im Erdgeschoss';
			}

            session.send(message, destination);   
            
		}
])

	.matches('Essensinformation', [
        function (session, args, next) {
            //session.send(session.message.text);

            var nahrungEntity = builder.EntityRecognizer.findEntity(args.entities, 'Nahrung');
			var trinkenEntity = builder.EntityRecognizer.findEntity(args.entities, 'Trinken');
			var restaurantEntity = builder.EntityRecognizer.findEntity(args.entities, 'Restaurant');
			var etautomatEntity = builder.EntityRecognizer.findEntity(args.entities, 'etAutomat');
			
            if (nahrungEntity) {
               
                session.dialogData.searchType = 'Nahrung';
                next({ response: nahrungEntity.entity }); 
            } 
			 else if (restaurantEntity) {
               
                session.dialogData.searchType = 'Restaurant';
                next({ response: restaurantEntity.entity }); 
            } 
			else if (etautomatEntity) {
               
                session.dialogData.searchType = 'etAutomat';
                next({ response: etautomatEntity.entity }); 
			}
			else if (trinkenEntity) {
               
                session.dialogData.searchType = 'Trinken';
                next({ response: trinkenEntity.entity }); 
            } else {
                
                builder.Prompts.text(session, 'Bitte wiederholen Sie Ihre Frage');
            }
        },
		
        function (session, results) {
            var destination = results.response;

            var message = '';
            if (session.dialogData.searchType === 'Nahrung') {
                message +=  'Eine Cafeteria befidnet sich im Erdgeschoss. Snackautomaten finden Sie dort im Flur';
			
            }
			else if (session.dialogData.searchType === 'Restaurant') {
                message +=  'Eine Cafeteria befidnet sich im Erdgeschoss.';
			
            }
			else if (session.dialogData.searchType === 'etAutomat') {
                message +=  'Ein Getränkeautomat  und ein Snackautomat befinden sich im Flur im Erdgeschoss';
				
            }
			else if (session.dialogData.searchType === 'Trinken') {
                message +=  'Ein Getränkeautomat befindet sich im Flur im Erdgeschoss';
				
            } else {
				 message += 'Bitte wiederholen Sie Ihre Frage';
			}

            session.send(message, destination);   
            
		},

        
])

	.matches('Besuchszeiten', [
        function (session, args, next) {
            //session.send(session.message.text);

            var beginnEntity = builder.EntityRecognizer.findEntity(args.entities, 'Beginn');
			var endeEntity = builder.EntityRecognizer.findEntity(args.entities, 'Ende');
			var besuchEntity = builder.EntityRecognizer.findEntity(args.entities, 'Besuch');
			var besuchszeitenEntity = builder.EntityRecognizer.findEntity(args.entities, 'Besuchszeiten');
			
            if (besuchszeitenEntity) {
               
                session.dialogData.searchType = 'Besuchszeiten';
                next({ response: besuchszeitenEntity.entity }); 
            } 
			 else if (beginnEntity) {
               
                session.dialogData.searchType = 'Beginn';
                next({ response: beginnEntity.entity }); 
            } 
			else if (endeEntity) {
               
                session.dialogData.searchType = 'Ende';
                next({ response: endeEntity.entity }); 
			}
			else if (besuchEntity) {
               
                session.dialogData.searchType = 'Besuch';
                next({ response: besuchEntity.entity }); 
            } else {
                
                builder.Prompts.text(session, 'Was wollen Sie über die Besuchszeiten wissen?');
            }
        },
		
        function (session, results) {
            var destination = results.response;

            var message = '';
            if (session.dialogData.searchType === 'Besuchszeiten') {
                message +=  'Die Besuchszeiten sind von Montag bis Samstag zwischen 8 und 19 Uhr und Sonntags von 9 bis 18 Uhr.';
			
            }
			else if (session.dialogData.searchType === 'Beginn') {
                message +=  'Sie können von Montag bis Samstag ab 8 Uhr und Sonntags ab 9 Uhr kommen';
			
            }
			else if (session.dialogData.searchType === 'Ende') {
                message +=  'Die Besuchszeit endet um 19 Uhr';
				
            }
			else if (session.dialogData.searchType === 'Besuch') {
                message +=  'Sie können von Montag bis Samstag zwischen 8 und 19 Uhr zu Besuch kommen.';
				
            } else {
				 message += 'Was wollen Sie über die Besuchszeiten wissen?';
			}

            session.send(message, destination);   
            
		},

        
])

.matches('Hygienebereich', [
        function (session, args, next) {
            //session.send(session.message.text);

            var hygieneEntity = builder.EntityRecognizer.findEntity(args.entities, 'Hygienebereich');
           
            if (hygieneEntity) {
                
                session.dialogData.searchType = 'Hygienebereich';
                next({ response: hygieneEntity.entity });
            } else {
                
                builder.Prompts.text(session, 'Wie war Ihre Frage noch gleich?');
            }
        },
		
        function (session, results) {
            var destination = results.response;

            var message = '';
            if (session.dialogData.searchType === 'Hygienebereich') {
                message += ' %s befindet sich in jedem Stockwerk gleich neben der Treppe';
            } else {
				 message += 'Wie war Ihre Frage noch gleich?';
			}

            session.send(message, destination);
            
		}
])

	.matches('Souveniersuche', [
        function (session, args, next) {
            //session.send(session.message.text);

            var mitbringEntity = builder.EntityRecognizer.findEntity(args.entities, 'Mitbringsel');
            var shopEntity = builder.EntityRecognizer.findEntity(args.entities, 'Shop');
			
            if (mitbringEntity) {
               
                session.dialogData.searchType = 'Mitbringsel';
                next({ response: mitbringEntity.entity });
            }  
			else if (shopEntity) {
               
                session.dialogData.searchType = 'Shop';
                next({ response: shopEntity.entity }); 
            } else {
                
                builder.Prompts.text(session, 'Wie bitte?');
            }
        },
		
        function (session, results) {
            var destination = results.response;

            var message = '';
            if (session.dialogData.searchType === 'Mitbringsel') {
                message += '%s können Sie in unserem Souveniershop im Erdgeschoss kaufen';
            } 
			else if (session.dialogData.searchType === 'Shop') {
                message +=  '%s befindet sich im Erdgeschoss neben dem Wartebereich';
			
            } else {
				 message += 'Wie bitte?';
			}

            session.send(message, destination);   
            
		}
])

// Bedanken 
	 .matches('Bedanken', [  
	 
        function (session) {	
        //session.send("Kann ich Ihnen sonst noch helfen?", results.response.entity);
        builder.Prompts.choice(session, "Kann ich Ihnen sonst noch helfen?", "Ja|Nein");
		},
		
		function (session, results) {
			
			var jn = {
   			 "Ja": {
				 antwort: 'Wie kann ich Ihnen sonst noch helfen?'
   				 },
   			 "Nein": {
				 antwort: 'Dann wünsche ich noch einen schönen Tag'
   				 }
				 };
				 
			 if (results.response) {
            var ant = jn [results.response.entity];
            session.send(" %(antwort)s", ant); 
        } else {
            session.send("ich habe Sie leider nicht verstanden ");
			session.replaceDialog('Bedanken');
        }
		session.endDialog();
		}
])


.matches('None', [
        function (session, args, next) {
            //session.send(session.message.text);

            // try extracting entities
            var noneEntity = builder.EntityRecognizer.findEntity(args.entities, 'None');
           
            if (noneEntity) {
                // city entity detected, continue to next step
                session.dialogData.searchType = 'None';
                next({ response: noneEntity.entity });
            } else {
                // no entities detected, ask user for a destination
                builder.Prompts.text(session, 'Ich kann sehr gut Witze erzählen');
            }
        },
        function (session, results) {
            var destination = results.response;

            var message = '';
            if (session.dialogData.searchType === 'None') {
                message += 'Wie bekommt man eine Giraffe in den Kühlschrank?';
            } else {
				 message += 'Wie bekommt man eine Giraffe in den Kühlschrank? Tür auf, Giraffe rein, Tür zu';
			}

            session.send(message, destination);

           
            
		}
])

// Verabschiedung
 	.matches('Verabschiedung', [
        
        function (session, results) {
            var destination = results.response;

            var message = 'Einen schönen Tag noch';
            session.send(message, destination);
		}
]));


// Auswahl Patient oder Arzt
// Variablen für Auswahl mit zugehöriger Zimmernummer --> Datenbank
var pauswahl = {
    "Patient": {
        units: 201
    },
    "Patientin": {
        units: 301
    },
	 "Ärztin": {
        units: 401
    },
    "Arzt": {
        units: 501
    }
};
bot.dialog('personenauswahl', [
	function (session) {
		session.send('Ich brauche dazu genauere Angaben:');
        builder.Prompts.choice(session, 'Ist die Person hier Patient oder Arzt?', pauswahl);		
	},
		// Hier sind dann Name und Arzt/Patient bekannt --> würde reichen
		//Also hier direkt eine Antwort geben
	function (session, results) {
		if (results.response) {
            var room = pauswahl[results.response.entity];
            session.send("Die Person befinde sich in Raum %(units)d", room); 
        } else {
            session.send("ich habe Sie leider nicht verstanden ");
			session.replaceDialog('personenauswahl');
        }
		session.endDialog('Ich hoffe ich konnte Ihnen helfen');
		},
	//function (session, results) {
		//session.endDialog('Ich hoffe ich konnte Ihnen helfen');
		//}
]);

bot.dialog('patientenauswahl', [
	function (session) {
         builder.Prompts.text(session, "Wie ist der Name des Patienten?");
	},

	function (session, results) {
			session.send(' %s liegt in Zimmer 343', results.response);
			session.endDialog();
	}
	
]);

bot.dialog('vornamenabfrage', [
	function (session) {
		
         builder.Prompts.text(session, "Wie ist denn der Vorname?");
	},

	function (session, results) {
		 builder.Prompts.choice(session, 'Ist die Person hier Patient oder Arzt?', pauswahl);		
	},
		// Hier sind dann Name und Arzt/Patient bekannt --> würde reichen
		//Also hier direkt eine Antwort geben
		function (session, results) {
			 if (results.response) {
            var room = pauswahl[results.response.entity];
            session.send("Die Person befinde sich in Raum %(units)d", room); 
        } else {
            session.send("ich habe Sie leider nicht verstanden ");
			session.replaceDialog('personenauswahl');
        }
		session.endDialog('Ich hoffe ich konnte Ihnen helfen');
		}
	
]);

bot.dialog('arztauswahl', [
	function (session) {
        builder.Prompts.text(session, "Wie ist der Name des Arztes?");
	},

	function (session, results) {
			session.send(' %s finden Sie in Zimmer 232 im 1. Stock', results.response);
			session.endDialog();
	}
	
]);

