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

/* START Demo data: */
$now = new DateTime();
array_push($modules, array(
	"mac" => 'AA:BB:CC:DD:EE:FF',
	"name" => 'DemoData',
	"datetime" => $now->format('Y-m-d H:i:s'),
	"bat_volt" => rand(110,140)/10,
	"bat_volt_min" => rand(110,140)/10,
	"bat_volt_max" => rand(110,140)/10,
	"in1_volt" => rand(110,140)/10,
	"in1_amp" => 0.5,
	"in2_amp" => 0.2,
	"temp1" => rand(210,340)/10,
	"chg_state" => "demo_state",
	"charging" => false,
	"load_switch" => true
));
/* END Demo Data */

$solarJson = array( 
	"modules" => $modules
);

// return results as JSON
header("Content-Type: application/json");
print_r(json_encode($solarJson));
?>