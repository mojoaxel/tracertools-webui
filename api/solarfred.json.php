<?php
$solarfred = fopen ("http://vpn8.leipzig.freifunk.net/solarfestival/solarfredjson.txt", "r");

if (!$solarfred) {
	header("HTTP/1.0 500 Internal Server Error");
    echo "<h1>Error: Solarfred konnte nicht geladen werden.</h1>\n";
    exit;
}

$modules = array();

while (!feof ($solarfred)) {
	$line = fgets($solarfred);
	if (!empty($line)) {
		$line = str_replace('{', "", $line);
		$line = str_replace('}', "", $line);

    	list($mac, $data) = split(", ", $line, 2);
    	list($name, $datetime, $bat_volt, $in1_volt, $in1_amp,  $in2_amp, $bat_volt_min, $bat_volt_max, $temp1, $chg_state, $charging, $load_switch)  = split(", ", $data, 13);

    	$mac = str_replace('"', "", str_replace(' ', "", $mac));
    	$name = str_replace("'", "", str_replace('"', "", $name));
    	$datetime = str_replace("'", "", $datetime);

    	//echo($mac ."\n". $name ."\n". $datetime ."\n". $bat_volt ."\n". $bat_volt_min ."\n". $bat_volt_max ."\n". $in1_volt ."\n". $in1_amp ."\n". $in2_amp ."\n". $temp1 ."\n". $chg_state ."\n". $charging ."\n". $load_switch . "\n\n");

    	array_push($modules, array(
			"mac" => $mac, 
			"name" => $name,
			"datetime" => $datetime,
			"bat_volt" => $bat_volt, 
			"bat_volt_min" => $bat_volt_min,
			"bat_volt_max" => $bat_volt_max, 
			"in1_volt" => $in1_volt, 
			"in1_amp" => $in1_amp, 
			"in2_amp" => $in2_amp, 
			"temp1" => $temp1, 
			"chg_state" => $chg_state,
			"charging" => $charging,
			"load_switch" => $load_switch
		));
	};
}
fclose($solarfred);

$solarJson = array( 
	"modules" => $modules
);

// return results as JSON
header("Content-Type: application/json");
print_r(json_encode($solarJson));
?>