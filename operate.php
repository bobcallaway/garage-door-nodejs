<?php
    include('amazonsns.class.php');

    $result = "failed";
    $message = "";

    if ($_GET["key"]) {
	try {
            $topicArn = "arn:aws:sns:us-east-1:990510411818:bells-walk-garage-door";
            
            $AmazonSNS = new AmazonSNS("AKIAJDLWE5IHVSJBQD2Q",htmlspecialchars($_GET["key"]));
            
            $AmazonSNS->publish($topicArn, '{ message: "operate" }');
            
            $result = "issued";
            $message = "door command triggered";
        } catch (Exception $e) {
            $message = $e->getMessage();
	}
    }
    else {
        $message = "no key specified";
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
