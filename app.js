var AWS = require('aws-sdk'), util = require('util'), async = require('async'), pushover = require('node-pushover'), gpio = require('pi-gpio'); 

AWS.config.loadFromPath('./config/aws_config.json');

var sqs = new AWS.SQS().client;
var push = new pushover({ token: pushover_token, user: pushover_user });

var config = {
    PIN: 7,
    RELAY_ON: 0,
    RELAY_OFF: 1,
    RELAY_TIMEOUT: 5
};

function delayPinWrite(pin, value, callback) {
    setTimeout(function() {
        gpio.write(pin, value, callback);
    }, config.RELAY_TIMEOUT);
}

function readMessage() {
    sqs.receiveMessage({
        "QueueUrl": "https://sqs.us-east-1.amazonaws.com/990510411818/bells-walk-garage-door-queue",
        "MaxNumberOfMessages": 1,
        "VisibilityTimeout": 30,
        "WaitTimeSeconds": 20
        }, function (err, data) {
            var sqs_message_body;
            if ((data.Messages) && (typeof data.Messages[0] !== 'undefined' && typeof data.Messages[0].Body !== 'undefined')) {
                //sqs msg body
                sqs_message_body = JSON.parse(data.Messages[0].Body);
                console.log(sqs_message_body.Message);
                /*async.series([
                    function(callback) {
                    // Open pin for output
                    //gpio.open(config.PIN, "output", callback);
                    },
                    function(callback) {
                    // Turn the relay on
                    //gpio.write(config.PIN, config.RELAY_ON, callback);
                    },
                    function(callback) {
                    // Turn the relay off after delay to simulate button press
                    //delayPinWrite(config.PIN, config.RELAY_OFF, callback);
                    },
                    function(err, results) {
                    setTimeout(function() {
                        // Close pin from further writing
                        //gpio.close(config.PIN);
                        // Return json
                        push.send("Door command successful", "Garage door has been opened/closed!");
                        }, config.RELAY_TIMEOUT);
                    }
                ]); */

                push.send("Door command successful", "Garage door has been opened/closed!");
                //delete message from queue
                sqs.deleteMessage({
                    "QueueUrl" : "https://sqs.us-east-1.amazonaws.com/990510411818/bells-walk-garage-door-queue",
                    "ReceiptHandle" :data.Messages[0].ReceiptHandle
                    }, function(err, data){                
                    });
            }
            readMessage();                
        });
    }          
readMessage();        
