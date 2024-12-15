function init(){
	game_over = false;
	
	// warn on close
	window.addEventListener("beforeunload", function (e) {
		if (game_over) return null;
		
		var confirmationMessage = 'Do you really want to exit?';
		
		(e || window.event).returnValue = confirmationMessage; //Gecko + IE
		return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
	});
	
	num_players = 2
	starting_score = 501
	
	// initialize score
	scores = Array(num_players).fill(starting_score);
	score_at_beginning_of_round = starting_score;
	
	// initialite lists of divs
	score_divs = Array(num_players);
	heading_divs = Array(num_players);
	for (let i = 0; i < num_players; i++) {
		score_divs[i] = document.getElementById("player-score-" + i);
		score_divs[i].innerHTML = starting_score;
		heading_divs[i] = document.getElementById("player-heading-" + i);
	}
	throw_divs = [0,1,2].map((x) => document.getElementById("throw-" + x));

	// initialize player 1's turn
	turn = 0;
	set_turn(0);
		
	// initialize input to single
	set_input_multiplier(1);
}

function set_input_multiplier(mul) {
	// only 1, 2 and 3 are allowed
	if ([1,2,3].indexOf(mul) == -1) return;
	input_multiplier = mul;
	
	let number_prefix = "";
	switch (input_multiplier) {
		case 1:
			document.getElementById("score-button-x2").disabled = false;
			document.getElementById("score-button-x3").disabled = false;
			document.getElementById("score-button-out").disabled = false;
			document.getElementById("score-button-undo").disabled = true; // TODO. implement undo
			document.getElementById("score-button-bull").disabled = false;
			
			document.getElementById("score-button-x2").classList.remove("active-modifier");
			document.getElementById("score-button-x3").classList.remove("active-modifier");
			
			document.getElementById("score-button-bull").innerHTML = "SB";
			
			number_prefix = "";
			break;
		case 2:
			document.getElementById("score-button-x2").disabled = false;
			document.getElementById("score-button-x3").disabled = true;
			document.getElementById("score-button-out").disabled = true;
			document.getElementById("score-button-undo").disabled = true;
			document.getElementById("score-button-bull").disabled = false;
			
			document.getElementById("score-button-x2").classList.add("active-modifier");
			document.getElementById("score-button-x3").classList.remove("active-modifier");
			
			document.getElementById("score-button-bull").innerHTML = "DB";
			
			number_prefix = "D";
			break;
		case 3:
			document.getElementById("score-button-x2").disabled = true;
			document.getElementById("score-button-x3").disabled = false;
			document.getElementById("score-button-out").disabled = true;
			document.getElementById("score-button-undo").disabled = true;
			document.getElementById("score-button-bull").disabled = true;
			
			document.getElementById("score-button-x2").classList.remove("active-modifier");
			document.getElementById("score-button-x3").classList.add("active-modifier");
			
			number_prefix = "T";
			break;
		
	}
	// set labels of all number buttons
	for (let i = 1; i <= 20; i++) {
		document.getElementById("score-button-" + i).innerHTML = (number_prefix + i);
	}
}

function set_turn(next_turn) {
	heading_divs[turn].classList.remove('active-turn');
	score_divs[turn].classList.remove('active-turn');
	
	turn = next_turn;
	darts_thrown = 0;
	
	heading_divs[turn].classList.add('active-turn');
	score_divs[turn].classList.add('active-turn');
	
	score_at_beginning_of_round = scores[turn];
}

function update_score(points, button_label) {
	// if first throw of turn, clear throw display
	if (darts_thrown == 0) {
		throw_divs.forEach(function(throw_div) {
			throw_div.classList.remove("throw-last-turn");
			throw_div.innerHTML = "";
		}); 
	}
	
	// subtract thrown points and update throw display
	scores[turn] -= points;
	throw_divs[darts_thrown].innerHTML = button_label;
	score_divs[turn].innerHTML = scores[turn];
	
	darts_thrown++;
	
	// check if overthrown
	if (scores[turn] < 0) {
		// overthrown, reset and fill the remaining throws with "-"
		scores[turn] = score_at_beginning_of_round;
		score_divs[turn].innerHTML = scores[turn];
		for (; darts_thrown < 3; darts_thrown++) {
			throw_divs[darts_thrown].innerHTML = "-";
		}
	}
	
	// check if done
	if (scores[turn] == 0) {
		game_over = true;
		heading_divs[turn].classList.add('winner');
		score_divs[turn].classList.add('winner');
		return;
	}
	
	// if last throw in turn, increment turn and gray out throw display
	if (darts_thrown == 3) {
		set_turn((turn + 1) % num_players);
		throw_divs.forEach((throw_div) => console.log(throw_div.classList.add("throw-last-turn"))); 
	}
}

function button_click(element, event) {
	if (game_over) return;
	
	let button_id = event.target.id;
	let thrown_score;
	switch(button_id) {
		case "score-button-undo":
			// TODO: implement undo
			return;
		case "score-button-x2":
			if (input_multiplier != 2) {
				set_input_multiplier(2);
			} else {
				set_input_multiplier(1);
			}
			return;
		case "score-button-x3":
			if (input_multiplier != 3) {
				set_input_multiplier(3);
			} else {
				set_input_multiplier(1);
			}
			return;
		case "score-button-out":
			thrown_score = 0
			break;
		case "score-button-bull":
			thrown_score = 25;
			break;
		default:
			thrown_score = button_id.replace("score-button-", "")
			break;
	}
	update_score(thrown_score * input_multiplier, event.target.textContent);
	set_input_multiplier(1);
}
