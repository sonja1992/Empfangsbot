
var ttsservice;
/**
 * Simple function that is called on connect
 */
function say() {
    var session = new QiSession('10.36.0.236')
    /**
     * Session object (should be global )
     */
    /**
    * Get the speech service 
    */
    session.service('ALTextToSpeech').done(function (tts) {
        /**
         * Say hello
         */
        ttsservice = tts; 
        console.log('TTS geladen')
        //ttsservice.say('Hallo Marie, wie geht es dir')
    }).fail(function (error) {
        console.log('An error occurred:', error)
    });
}
 
function talk(phrase) {
    ttsservice.say(phrase)
}

function senden() {
    var phrase=document.getElementById("Sprachtext").value;
    ttsservice.say(phrase)
}

function move() {
    var session = new QiSession('10.36.0.236')
    /**
     * Session object (should be global )
     */
    /**
    * Get the motion service 
    */
     
    session.service('ALMotion').done(function (tts) {
        
        ttmotion = tts
        ttmotion.moveInit()
        ttmotion.moveTo(0.5,0,0,0.0)

    }).fail(function (error) {
        console.log('An error occurred:', error)
    });
    
}