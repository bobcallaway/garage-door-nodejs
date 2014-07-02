<?php
    include('amazonsns.class.php');

    $result = "failed";
    $message = "";

    if ($_GET["key"] and $_GET["command"]) {
        try {
            $topicArn = "arn:aws:sns:us-east-1:990510411818:bells-walk-garage-door";

            $AmazonSNS = new AmazonSNS("AKIAJDLWE5IHVSJBQD2Q",htmlspecialchars($_GET["key"]));

            $AmazonSNS->publish($topicArn, "{ \"command\": \"" . $_GET["command"] . "\" }");

            $result = "issued";
            $message = "Command " . $_GET["command"] . " triggered";
        } catch (Exception $e) {
            $message = $e->getMessage();
        }
    }
    else if ($_GET["command"]){
        $message = "no key specified";
    }
    else if ($_GET["key"]){
        $message = "no command specified";
    }
?>
<html>
<head>
<style>h1 {font-size:1000%;}</style>
<title>Command <?php echo $result; ?>!</title>
</head>
<body>
<h1><a href="javascript:window.close();"><?php echo $message; ?></a></h1>
</body>
</html>
