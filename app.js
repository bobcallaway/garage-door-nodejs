var AWS = require('aws-sdk'), util = require('util'), async = require('async'), pushover = require('node-pushover'), gpio = require('onoff').Gpio; 
require('log-timestamp');
//TODO instead of console log, set up syslog and logrotate to SD card
//TODO respond to status request from a php webpage
//on any state change (or a status request, dump a JSON object showing the state of the system into a queue. 
//on a periodic timer, put the status object into the queue

AWS.config.loadFromPath('./config/aws_config.json');

var pushoverConfig = require('./config/pushover.json');
var alarmCode = require('./config/alarm_code.json');

var sqs = new AWS.SQS().client;
var push = new pushover({ token: pushoverConfig.token, user: pushoverConfig.user });

// BEGIN ALARM CODE
var zoneInfo = require('./zone_info.json'), Alarm = require('ad2usb');
var maxZone = 0;
for (var zone in zoneInfo) {
    var myInt = parseInt(zone,10);
    if (myInt > maxZone) {
        maxZone = myInt;
    }
}

var alarm = Alarm.connect('127.0.0.1', 10000, function() {

    function scheduleFaultRemovalDetection(zoneNumber) {
        if (!(zoneInfo[zoneNumber].removeTask === undefined || zoneInfo[zoneNumber].removeTask === null)) {
            clearTimeout(zoneInfo[zoneNumber].removeTask);
        }
        else {
            push.send("Alarm notification", "Fault detected - "+zoneInfo[zoneNumber].name, -2);
            console.log("called push -2");
        }
        zoneInfo[zoneNumber].removeTask = setTimeout(
            function faultRemoved(zoneNumber) {
                zoneInfo[zoneNumber].removeTask = null;
                console.log('Fault removed from zone ' + zoneNumber + ': ' + zoneInfo[zoneNumber].name);
            }, 10000, zoneNumber);
    }

    // listen for any event
    alarm.onAny(function(state) {
        console.log('Emitted '+this.event + ' ' + state);
        if (this.event.lastIndexOf('battery:',0) === 0){
            parts = this.event.split(':');
            serial = parts.shift();
            for (var zone in zoneInfo) {
                if (zone.serial == serial) {
                    console.log('Battery for zone \'' +zone.name + '\' is '+state);
                    push.send("Low battery", "Low battery on wireless zone ("+zone.name+")",1); 
                    break;
                }
            }
        }
    });

    alarm.on('batteryLow', function(state) {
        if (state == true) { 
            console.log('Panel backup battery has low charge');
        }
    });

    alarm.on('disarmed', function() {
        console.log('Alarm is disarmed');
    });

    alarm.on('armedStay', function() {
        console.log('Alarm is armed in STAY state');
    });

    alarm.on('armedAway', function() {
        console.log('Alarm is armed in AWAY state');
    });

    alarm.on('alarmOccured', function(state) {});

    alarm.on('alarm', function(state) {
        if (state == true) {
            //TODO? have ack URL sent through pushover for disarm?
            push.send("ALARM TRIGGERED", "Fault detected!!!", 2);
            //TODO: this keeps firing even after alarm has gone away... what to do to fix this?
            console.log('Alarm has been triggered - its blaring!');
        }
    });

    alarm.on('fault', function(zoneNumber) {
        if ((zoneNumber > 1) && (zoneNumber <= maxZone)) {
            console.log('Fault in zone ' + zoneNumber + ': ' + zoneInfo[zoneNumber].name);
            scheduleFaultRemovalDetection(zoneNumber);
        }
    });
});
// END ALARM CODE
var startTime = Date.now();

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
                //console.log(sqs_message_body);
                //compare times - if this message came before we started, simply dequeue it and wait for the next one
                var messageTime = new Date(Date.parse(sqs_message_body.Timestamp));
                if (messageTime > startTime) {
                    var command = JSON.parse(sqs_message_body.Message);
                    console.log("received " + command.command + " command ... executing");
                    if (command.command == "openDoor")
                    {
                        //if door is already opened, noop
                        if (zoneInfo["17"].removeTask != null) {
                            console.log("requested that we open the garage door, but it's already open...");  
                            push.send("Garage Door Jenkins", "you requested that we open the garage door, but it's already open",1);
                        }
                        else {
                            push.send("Garage Door Jenkins", "you requested that we open the garage door, opening it now sir...",1);
                            alarm.triggerD(null);
                        }
                    }
                    else if (command.command == "closeDoor")
                    {
                        //if door is already closed, noop
                        if (zoneInfo["17"].removeTask == null) {
                            console.log("requested that we close the garage door, but it's already closed...");  
                            push.send("Garage Door Jenkins", "you requested that we close the garage door, but it's already closed",1);
                        }
                        else {
                            push.send("Garage Door Jenkins", "you requested that we close the garage door, closing it now sir...",1);
                            alarm.triggerD(null);
                        }
                    }
                    else {
                        alarm[command.command](alarmCode.code);
                        push.send("Alarm command '"+command.command+"'", "Success!",1);
                    }
                }
                else {
                    console.log("found message from before I started...");
                }

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
