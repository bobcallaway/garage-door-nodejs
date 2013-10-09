var AWS = require('aws-sdk'), util = require('util'), async = require('async');
//var gpio = require('pi-gpio');

// configure AWS
AWS.config.loadFromPath('./config/aws_config.json');
//AWS.config.update({ 'region': 'us-east-1', 'accessKeyId': 'AKIAIPADUMAIHXBKKNKQ', 'secretAccessKey': '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' });

var sqs = new AWS.SQS().client;

//function delayPinWrite(pin, value, callback) {
//    setTimeout(function() {
//        gpio.write(pin, value, callback);
//    }, config.RELAY_TIMEOUT);
//}

process.on( 'SIGINT', function() {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    // some other closing procedures go here
    process.exit( );
})

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
                console.log(sqs_message_body);
                /* async.series([
                        function(callback) {
                        // Open pin for output
                        gpio.open(config.LEFT_GARAGE_PIN, "output", callback);
                        },
                        function(callback) {
                        // Turn the relay on
                        gpio.write(config.LEFT_GARAGE_PIN, config.RELAY_ON, callback);
                        },
                        function(callback) {
                        // Turn the relay off after delay to simulate button press
                        delayPinWrite(config.LEFT_GARAGE_PIN, config.RELAY_OFF, callback);
                        },
                        function(err, results) {
                        setTimeout(function() {
                            // Close pin from further writing
                            gpio.close(config.LEFT_GARAGE_PIN);
                            // Return json
                            res.json("ok");
                            }, config.RELAY_TIMEOUT);
                        }
                ]); */

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

