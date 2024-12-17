function init(){
	game_over = false;
	
	// warn on close
	window.addEventListener("beforeunload", function (e) {
		if (game_over) return null;
		
		var confirmationMessage = 'Do you really want to exit?';
		
		(e || window.event).returnValue = confirmationMessage; //Gecko + IE
		return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
	});
	
	num_players = 5
	starting_score = 501
	
	// initialize score
	scores = Array(num_players).fill(starting_score);
	round_scores = Array(num_players).fill(0);
	cumulative_scores = Array(num_players).fill(0);
	total_darts_thrown = Array(num_players).fill(0);
	rounds_played = Array(num_players).fill(0);
	
	// initialite lists of divs
	score_divs = Array(num_players);
	stats_divs = Array(num_players);
	round_score_divs = Array(num_players);
	average_divs = Array(num_players);
	darts_divs = Array(num_players);
	for (let i = 0; i < num_players; i++) {
		score_divs[i] = document.getElementById("player-score-" + i);
		score_divs[i].innerHTML = starting_score;
		stats_divs[i] = document.getElementById("player-stats-" + i);
		round_score_divs[i] = document.getElementById("player-round-score-" + i);
		round_score_divs[i].innerHTML = "-"
		average_divs[i] = document.getElementById("player-average-" + i);
		average_divs[i].innerHTML = "&#x2300;-"
		darts_divs[i] = document.getElementById("player-darts-" + i);
		darts_divs[i].innerHTML = "&#x21A3;-"
	}
	throw_divs = [0,1,2].map((x) => document.getElementById("throw-" + x));
	for (let throw_div of throw_divs) throw_div.innerHTML = "";
	player_stats_container = document.getElementById("player-stats-container");

	// initialize checkout guide
	checkouts = get_checkout_list(true);
	checkout_div = document.getElementById("checkout-guide");

	// initialize player 1's turn
	turn = 0;
	set_turn(0);

	// initialize game history for undo
	game_history = [];
		
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
			document.getElementById("score-button-undo").disabled = (game_history.length == 0);
			document.getElementById("score-button-bull").disabled = false;
			
			document.getElementById("score-button-x2").classList.remove("active-modifier");
			document.getElementById("score-button-x3").classList.remove("active-modifier");
			
			document.getElementById("score-button-bull").innerHTML = "SB";
			document.getElementById("score-button-out").innerHTML = "Out";
			
			number_prefix = "";
			break;
		case 2:
			document.getElementById("score-button-undo").disabled = true;
			document.getElementById("score-button-bull").disabled = false;
			
			document.getElementById("score-button-x2").classList.add("active-modifier");
			document.getElementById("score-button-x3").classList.remove("active-modifier");
			
			document.getElementById("score-button-bull").innerHTML = "DB";
			document.getElementById("score-button-out").innerHTML = "Timo";
			
			number_prefix = "D";
			break;
		case 3:
			document.getElementById("score-button-undo").disabled = true;
			document.getElementById("score-button-bull").disabled = true;
			
			document.getElementById("score-button-x2").classList.remove("active-modifier");
			document.getElementById("score-button-x3").classList.add("active-modifier");
			
			document.getElementById("score-button-out").innerHTML = "Louis";
			
			number_prefix = "T";
			break;
		
	}
	// set labels of all number buttons
	for (let i = 1; i <= 20; i++) {
		document.getElementById("score-button-" + i).innerHTML = (number_prefix + i);
	}
}

function set_turn(next_turn) {
	stats_divs[turn].classList.remove('active-turn');
	
	turn = next_turn;
	darts_thrown = 0;
	
	stats_divs[turn].classList.add('active-turn');
	
	score_at_beginning_of_round = scores[turn];
	
	// update checkout guide
	checkout = checkouts[scores[turn]];
	if (checkout === undefined || (checkout.split(' ') > (3 - darts_thrown))) checkout = "";
	checkout_div.innerHTML = checkout;
	
	scroll_to_player(turn);
}

function update_score(points, button_label) {
	// if first throw of turn, clear throw display
	if (darts_thrown == 0) {
		throw_divs.forEach(function(throw_div) {
			throw_div.classList.remove("throw-last-turn");
			throw_div.innerHTML = "";
		}); 
	}
	
	// update game history
	throw_object = {
			'value': points,
			'label': button_label
	};
	
	if (darts_thrown == 0) {
		// first dart of round
		game_history.push({
			'player': turn,
			'darts': [],
			'beginning_score': score_at_beginning_of_round
		});
	}
	
	game_history[game_history.length-1].darts.push(throw_object);
	
	// subtract thrown points and update throw display
	scores[turn] -= points;
	throw_divs[darts_thrown].innerHTML = button_label;
	score_divs[turn].innerHTML = scores[turn];
	
	darts_thrown++;
	
	// update display of points thrown in this round
	let score_thrown_this_round = score_at_beginning_of_round - scores[turn];
	round_score_divs[turn].innerHTML = score_thrown_this_round;
	
	// update running statistics
	total_darts_thrown[turn]++;
	cumulative_scores[turn] += points;
	darts_divs[turn].innerHTML = ("&#x21A3;" + total_darts_thrown[turn])
	
	// check if overthrown
	if (scores[turn] < 0) {
		// overthrown, reset score, fill the remaining throws (and round score) with "-" and subtract thrown score from running total
		scores[turn] = score_at_beginning_of_round;
		score_divs[turn].innerHTML = scores[turn];
		for (; darts_thrown < 3; darts_thrown++) {
			throw_divs[darts_thrown].innerHTML = "-";
		}
		round_score_divs[turn].innerHTML = "-"
		cumulative_scores[turn] -= score_thrown_this_round;
	}
	
	// update checkout guide
	checkout = checkouts[scores[turn]];
	if (checkout === undefined || (checkout.split(' ').length > (3 - darts_thrown))) checkout = "";
	checkout_div.innerHTML = checkout;
	
	// update average display if end of round
	if ((scores[turn] == 0) || (darts_thrown == 3)) {
		rounds_played[turn]++;
		average_divs[turn].innerHTML = "&#x2300;" + (cumulative_scores[turn] / rounds_played[turn]).toFixed(1);
	}
	
	// end game if remaining score is 0
	if (scores[turn] == 0) {
		game_over = true;
		stats_divs[turn].classList.add('winner');
		return;
		// TODO: allow multi-player game to continue after 1 player is done
	}
	
	// if last throw in turn, increment turn and gray out throw display
	if (darts_thrown == 3) {
		set_turn((turn + 1) % num_players);
		throw_divs.forEach((throw_div) => throw_div.classList.add("throw-last-turn")); 
	}
}

function undo_throw() {
	/*
		We undo the last dart by resetting to the beginning of a round and then replaing the darts that were thrown, except for the last.
		If we are undoing the first dart of a round, this means resetting to the beginning of the previous round and replaying all 3 darts.
		Otherwise, we reset to the beginning of the current round and replay all but the last dart.
		The very first dart of the game requires special handling - we just reset the whole game.
		This is ugly, but works.
	*/
	
	// TODO: correctly update displayed statistics (especially the score)
	
	// return if game history is empty
	if (game_history.length == 0) return;
	
	// restart game if game was over
	if (game_over) {
		game_over = false;
		document.getElementsByClassName("winner")[0].classList.remove("winner");
	}
	
	// get last item ln list of rounds, removing it from the array
	history_object = game_history.pop();
	
	// reset statistics
	total_darts_thrown[history_object.player] -= history_object.darts.length;
	cumulative_scores[history_object.player] -= (history_object.beginning_score - scores[history_object.player]);
	if (darts_thrown == 0) rounds_played[history_object.player]--;
	scores[history_object.player] = history_object.beginning_score;
	
	// if undoing first dart of round, replay previous history item
	if (darts_thrown == 1) {
		if (game_history.length == 0) {
			// undoing very first dart
			// haesslich
			init();
		} else {
			// get last item ln list of rounds, removing it from the array
			history_object = game_history.pop();
		
			// reset statistics
			total_darts_thrown[history_object.player] -= history_object.darts.length;
			cumulative_scores[history_object.player] -= (history_object.beginning_score - scores[history_object.player]);
			rounds_played[history_object.player]--;
			scores[history_object.player] = history_object.beginning_score;
			
			// replay throws from history object
			set_turn(history_object.player);
			for (let i = 0; i < history_object.darts.length; i++) {
				update_score(history_object.darts[i].value, history_object.darts[i].label);
			}
		}
	} else {
		// replay throws from history object, excluding last dart
		set_turn(history_object.player);
		for (let i = 0; i < history_object.darts.length - 1; i++) {
			update_score(history_object.darts[i].value, history_object.darts[i].label);
		}
	}
}

function button_click(element, event) {
	let button_id = event.target.id;
	
	if (game_over && (button_id) != "score-button-undo") return;
	
	let thrown_score;
	
	switch(button_id) {
		case "score-button-undo":
			undo_throw();
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

function scroll_to_player(player_to_show) {
	// scroll horizontally of at least 3 players (only applies in vertical layout)
	if (num_players >= 3) {
		
		// calculate width if stat div to know how far to scroll
		let scrollLeftMax = player_stats_container.scrollWidth - player_stats_container.clientWidth;
		let player_stats_width = scrollLeftMax / (num_players - 2);
		
		/*
			We offset the scroll by a fraction of a player_stats_width to give a visual indication of where we are in the turn.
			Example for 5 players:
		
			0 -> 0 - 0/4 (left aligned)
			1 -> 1 - 1/4
			2 -> 2 - 2/4
			3 -> 3 - 3/4
			4 -> 4 - 4/4 (right aligned)
		*/
		
		let scroll_offset = player_to_show / (num_players - 1);
		
		player_stats_container.scrollLeft = (player_to_show - scroll_offset) * player_stats_width;
	}
	
	// scroll vertically if at least 4 players (only applies in horizontal layout)
	if (num_players >= 3) {
		
		// calculate height of stat div to know how far to scroll
		let scrollTopMax = player_stats_container.scrollHeight - player_stats_container.clientHeight;
		let player_stats_height = scrollTopMax / (num_players - 3);
		
		/*
			0 -> 0 - 0/3 (top aligned)
			1 -> 1 - 1/3
			2 -> 2 - 2/3
			3 -> 3 - 3/3 (bottom aligned)
			4 -> 4 - 3/3 (bottom aligned)
		*/
		
		let scroll_offset = Math.min(1, player_to_show / (num_players - 2));
		
		player_stats_container.scrollTop = (player_to_show - scroll_offset) * player_stats_height;
	}
	
	
}

function get_checkout_list(double_out) {
	if (double_out) {
		return {
			'170': 'T20 T20 DB',
			'167': 'T20 T19 DB',
			'164': 'T20 T18 DB',
			'161': 'T20 T17 DB',
			'160': 'T20 T20 D20',
			'158': 'T20 T20 D19',
			'157': 'T20 T19 D20',
			'156': 'T20 T20 D18',
			'155': 'T20 T19 D19',
			'154': 'T20 T18 D20',
			'153': 'T20 T19 D18',
			'152': 'T20 T20 D16',
			'151': 'T20 T17 D20',
			'150': 'T20 T18 D18',
			'149': 'T20 T19 D16',
			'148': 'T20 T20 D14',
			'147': 'T20 T17 D18',
			'146': 'T20 T18 D16',
			'145': 'T20 T19 D14',
			'144': 'T20 T20 D12',
			'143': 'T20 T17 D16',
			'142': 'T20 T14 D20',
			'141': 'T20 T19 D12',
			'140': 'T20 T20 D10',
			'139': 'T20 T13 D20',
			'138': 'T20 T18 D12',
			'137': 'T20 T19 D10',
			'136': 'T20 T20 D8',
			'135': 'SB T20 DB',
			'134': 'T20 T16 D13',
			'133': 'T20 T19 D8',
			'132': 'DB DB D16',
			'131': 'T20 T13 D16',
			'130': 'T20 T20 D5',
			'129': 'T19 T16 D12',
			'128': 'T18 T14 D16',
			'127': 'T20 T17 D8',
			'126': 'T19 T19 D6',
			'125': 'T18 T19 D7',
			'124': 'T20 T14 D11',
			'123': 'T19 T16 D9',
			'122': 'T18 T18 D7',
			'121': 'T20 T11 D14',
			'120': 'T20 20 D20',
			'119': 'T19 T12 D13',
			'118': 'T20 18 D20',
			'117': 'T20 17 D20',
			'116': 'T19 19 D20',
			'115': 'T20 15 D20',
			'114': 'T18 20 D20',
			'113': 'T19 16 D20',
			'112': 'T20 T12 D8',
			'111': 'T19 14 D20',
			'110': 'T19 13 D20',
			'109': 'T20 9 D20',
			'108': 'T20 16 D16',
			'107': 'T19 T10 D10',
			'106': 'T20 10 D18',
			'105': 'T20 13 D16',
			'104': 'T19 7 D20',
			'103': 'T19 6 D20',
			'102': 'T20 10 D16',
			'101': 'T20 9 D16',
			'100': 'T20 D20',
			'99': 'T19 10 D16',
			'98': 'T20 D19',
			'97': 'T19 D20',
			'96': 'T20 D18',
			'95': 'T19 D19',
			'94': 'T18 D20',
			'93': 'T19 D18',
			'92': 'T20 D16',
			'91': 'T17 D20',
			'90': 'T20 D15',
			'89': 'T19 D16',
			'88': 'T20 D14',
			'87': 'T17 D18',
			'86': 'T18 D16',
			'85': 'T15 D20',
			'84': 'T20 D12',
			'83': 'T17 D16',
			'82': 'DB D16',
			'81': 'T19 D12',
			'80': 'T20 D10',
			'79': 'T19 D11',
			'78': 'T18 D12',
			'77': 'T19 D10',
			'76': 'T20 D8',
			'75': 'T17 D12',
			'74': 'T14 D16',
			'73': 'T19 D8',
			'72': 'T16 D12',
			'71': 'T13 D16',
			'70': 'T18 D8',
			'69': 'T19 D6',
			'68': 'T20 D4',
			'67': 'T17 D8',
			'66': 'T10 D18',
			'65': 'T11 D16',
			'64': 'T16 D8',
			'63': 'T13 D12',
			'62': 'T10 D16',
			'61': 'T15 D8',
			'60': '20 D20',
			'59': '19 D20',
			'58': '18 D20',
			'57': '17 D20',
			'56': 'T16 D4',
			'55': '15 D20',
			'54': '14 D20',
			'53': '13 D20',
			'52': '12 D20',
			'51': '11 D20',
			'50': 'DB',
			'49': '9 D20',
			'48': '16 D16',
			'47': '7 D20',
			'46': '6 D20',
			'45': '5 D20',
			'44': '12 D16',
			'43': '3 D20',
			'42': '10 D16',
			'41': '9 D16',
			'40': 'D20',
			'39': '1 D19',
			'38': 'D19',
			'37': '1 D18',
			'36': 'D18',
			'35': '1 D17',
			'34': 'D17',
			'33': '1 D16',
			'32': 'D16',
			'31': '1 D15',
			'30': 'D15',
			'29': '1 D14',
			'28': 'D14',
			'27': '1 D13',
			'26': 'D13',
			'25': '1 D12',
			'24': 'D12',
			'23': '1 D11',
			'22': 'D11',
			'21': '1 D10',
			'20': 'D10',
			'19': '1 D9',
			'18': 'D9',
			'17': '1 D8',
			'16': 'D8',
			'15': '1 D7',
			'14': 'D7',
			'13': '1 D6',
			'12': 'D6',
			'11': '1 D5',
			'10': 'D5',
			'9': '1 D4',
			'8': 'D4',
			'7': '1 D3',
			'6': 'D3',
			'5': '1 D2',
			'4': 'D2',
			'3': '1 D1',
			'2': 'D1'
		};
	} else {
		// TODO: checkout guide for single out
		return {};
	}
}
