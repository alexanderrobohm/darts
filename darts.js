/* 
 * Copyright (C) 2024 Alexander Robohm
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <https://www.gnu.org/licenses/>. 
 */

function init(){
	game_over = false;
	
	// warn on close
	window.addEventListener("beforeunload", function (e) {
		if (game_over) return null;
		
		var confirmationMessage = 'Do you really want to exit?';
		
		(e || window.event).returnValue = confirmationMessage; //Gecko + IE
		return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
	});
	
	// get game parameters
	const params = new URLSearchParams(document.location.search);
	num_players = parseInt(params.get("n")) || 2;
	starting_score = parseInt(params.get("s")) || 501;
	double_out = params.get("d") == "y";
	
	if (num_players < 1) num_players = 2;
	if (starting_score < 1) starting_score = 2;
	
	// initialize list of winners
	winners = [];
	
	// initialize score
	scores = Array(num_players).fill(starting_score);
	round_scores = Array(num_players).fill(0);
	cumulative_scores = Array(num_players).fill(0);
	total_darts_thrown = Array(num_players).fill(0);
	rounds_played = Array(num_players).fill(0);
	
	// generate divs and initialize lists of divs
	player_stats_container = document.getElementById("player-stats-container");
	stats_divs = Array(num_players);
	heading_divs = Array(num_players);
	score_divs = Array(num_players);
	average_divs = Array(num_players);
	darts_divs = Array(num_players);
	round_score_divs = Array(num_players);
	for (let i = 0; i < num_players; i++) {
		// stats
		stats_divs[i] = document.createElement("div");
		stats_divs[i].id = "player-stats-" + i;
		stats_divs[i].classList.add("player-stats");
		// heading
		heading_divs[i] = document.createElement("div");
		heading_divs[i].id = "player-heading-" + i;
		heading_divs[i].classList.add("player-heading");
		heading_divs[i].innerText = "Player " + (i+1);
		// score
		score_divs[i] = document.createElement("div");
		score_divs[i].id = "player-score-" + i;
		score_divs[i].classList.add("player-score");
		// average
		average_divs[i] = document.createElement("div");
		average_divs[i].id = "player-average-" + i;
		average_divs[i].classList.add("player-average");
		// darts
		darts_divs[i] = document.createElement("div");
		darts_divs[i].id = "player-darts-" + i;
		darts_divs[i].classList.add("player-darts");
		// round score
		round_score_divs[i] = document.createElement("div");
		round_score_divs[i].id = "player-round-score-" + i;
		round_score_divs[i].classList.add("player-round-score");
		
		// append to document
		stats_divs[i].appendChild(heading_divs[i]);
		stats_divs[i].appendChild(score_divs[i]);
		stats_divs[i].appendChild(average_divs[i]);
		stats_divs[i].appendChild(darts_divs[i]);
		stats_divs[i].appendChild(round_score_divs[i]);
		player_stats_container.appendChild(stats_divs[i]);
		
		// update content
		update_score_display(i, true, true);
	}
	throw_divs = [0,1,2].map((x) => document.getElementById("throw-" + x));
	for (let throw_div of throw_divs) throw_div.innerHTML = "";

	// initialize checkout guide
	checkouts = get_checkout_list(double_out);
	checkout_div = document.getElementById("checkout-guide");

	// initialize player 1's turn
	turn = 0;
	set_turn(0);

	// initialize game history for undo
	game_history = [];
		
	// initialize input to single
	set_input_multiplier(1);
	
	// initialize settings
	selected_starting_score = starting_score;
	selected_double_out = double_out;
	selected_num_players = num_players;
	set_settings_display(false);
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
	
	darts_thrown++;
	
	let score_thrown_this_round = score_at_beginning_of_round - scores[turn];
	
	// update running statistics
	total_darts_thrown[turn]++;
	cumulative_scores[turn] += points;
	
	// was the throw a double?
	let throw_was_double = /^D(B|\d+)$/.test(button_label);
	
	// check if overthrown
	let overthrown = scores[turn] < 0 || (double_out && scores[turn] == 1) || (double_out && !throw_was_double && scores[turn] == 0);
	if (overthrown) {
		// reset score, fill the remaining throws (and round score) with "-" and subtract thrown score from running total
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
	let do_update_average_display = false;
	if ((scores[turn] == 0) || (darts_thrown == 3)) {
		rounds_played[turn]++;
		do_update_average_display = true;
	}
	
	// update score/stats display
	update_score_display(turn, do_update_average_display, overthrown);
	
	// player wins of remaining score is 0
	let player_won = scores[turn] == 0 && !overthrown;
	if (player_won) {
		winners.push(turn);
		update_score_display(turn, true, false);
		
		// end game if only 1 player remains
		if (winners.length >= num_players-1) {
			game_over = true;
		}
	}
	
	// if last throw in turn, increment turn to next non-finished player
	if (!game_over && (darts_thrown == 3 || player_won)) {
		set_turn(get_next_turn(turn));

		// gray out throw display
		throw_divs.forEach((throw_div) => throw_div.classList.add("throw-last-turn")); 
	}
}

function get_next_turn(current_turn) {
	let next_turn = (current_turn + 1) % num_players;
	while (winners.indexOf(next_turn) != -1) next_turn = (next_turn + 1) % num_players;
	return next_turn;
}

function undo_throw() {
	/*
	 * We undo the last dart by resetting to the beginning of a round and then replaing the darts that were thrown, except for the last.
	 * If we are undoing the first dart of a round, this means resetting to the beginning of the previous round and replaying all 3 darts.
	 * Otherwise, we reset to the beginning of the current round and replay all but the last dart.
	 * The very first dart of the game requires special handling.
	*/
	
	// return if game history is empty
	if (game_history.length == 0) return;
	
	// restart game if game was over
	if (game_over) {
		game_over = false;
		rounds_played[winners.pop()]--;
	}
	
	// get last item ln list of rounds, removing it from the array
	history_object = game_history.pop();
	
	// reset statistics
	total_darts_thrown[history_object.player] -= history_object.darts.length;
	cumulative_scores[history_object.player] -= (history_object.beginning_score - scores[history_object.player]);
	if (darts_thrown == 0) rounds_played[history_object.player]--;
	scores[history_object.player] = history_object.beginning_score;
	if (winners.indexOf(history_object.player) != -1) winners.pop();
	
	// check if we undid last dart of previous round
	let undo_across_rounds = (darts_thrown == 0);
	let current_player = turn;
	
	// if undoing first dart of round, replay previous history item
	if (darts_thrown == 1) {
		if (game_history.length == 0) {
			// undoing very first dart, clear throw display
			throw_divs.forEach(function(throw_div) {
				throw_div.classList.remove("throw-last-turn");
				throw_div.innerHTML = "";
			});
			
			// and reinitialize the first turn
			set_turn(turn);
			update_score_display(turn, true, true);
			
			return;
		} else {
			// get last item ln list of rounds, removing it from the array
			history_object = game_history.pop();
		
			// reset statistics
			total_darts_thrown[history_object.player] -= history_object.darts.length;
			cumulative_scores[history_object.player] -= (history_object.beginning_score - scores[history_object.player]);
			rounds_played[history_object.player]--;
			scores[history_object.player] = history_object.beginning_score;
			if (winners.indexOf(history_object.player) != -1) winners.pop();
			
			update_score_display(history_object.player, true);
			
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
	
	update_score_display(current_player, true, undo_across_rounds);
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
		 * We offset the scroll by a fraction of a player_stats_width to give a visual indication of where we are in the turn.
		 * Example for 5 players:
		 * 
		 * 0 -> 0 - 0/4 (left aligned)
		 * 1 -> 1 - 1/4
		 * 2 -> 2 - 2/4
		 * 3 -> 3 - 3/4
		 * 4 -> 4 - 4/4 (right aligned)
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
		 * 0 -> 0 - 0/3 (top aligned)
		 * 1 -> 1 - 1/3
		 * 2 -> 2 - 2/3
		 * 3 -> 3 - 3/3 (bottom aligned)
		 * 4 -> 4 - 3/3 (bottom aligned)
		*/
		
		let scroll_offset = Math.min(1, player_to_show / (num_players - 2));
		
		player_stats_container.scrollTop = (player_to_show - scroll_offset) * player_stats_height;
	}
}

function update_score_display(player_to_update, update_average, clear_round_score) {
	if (clear_round_score) {
		round_score_divs[player_to_update].innerHTML = "-";
	} else {
		round_score_divs[player_to_update].innerHTML = score_at_beginning_of_round - scores[player_to_update];
	}
	
	if (total_darts_thrown[player_to_update] != 0) {
		darts_divs[player_to_update].innerHTML = ("&#x21A3;" + total_darts_thrown[player_to_update]);
	} else {
		darts_divs[player_to_update].innerHTML = ("&#x21A3;-");
	}
	
	if (update_average) {
		if (rounds_played[player_to_update] != 0) {
			average_divs[player_to_update].innerHTML = "&#x2300;" + (cumulative_scores[player_to_update] / rounds_played[player_to_update]).toFixed(1);
		} else {
			average_divs[player_to_update].innerHTML = "&#x2300;-";
		}
	}
	
	// display player's place if done, score otherwise
	let place = winners.indexOf(player_to_update) + 1;
	if (place > 0) {
		stats_divs[player_to_update].classList.add("winner");
		score_divs[player_to_update].innerText = "#" + place;
	} else {
		stats_divs[player_to_update].classList.remove("winner");
		score_divs[player_to_update].innerHTML = scores[player_to_update];
	}
}

function get_checkout_list(double_out) {
	// TODO: checkout giude for single out
	if (true) {
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
		return {};
	}
}

function settings_button_click(element, event) {
	let button_id = event.target.id;
	
	let addsub_player = 0;
	switch(button_id) {
		case "settings-button-301":
			selected_starting_score = 301;
			break;
		case "settings-button-501":
			selected_starting_score = 501;
			break;
		case "settings-button-so":
			selected_double_out = false;
			break;
		case "settings-button-do":
			selected_double_out = true;
			break;
		case "add-player":
			addsub_player = 1;
			break;
		case "sub-player":
			addsub_player = -1;
			break;
		case "settings-button-cancel":
			set_settings_display(false);
			return;
		case "settings-button-ok":
			// reload page with correct settings
			let query_string = "?s=" + selected_starting_score + "&d=" + (selected_double_out ? "y" : "n") + "&n=" + selected_num_players;
			window.location.search = query_string;
			return;
	}
	
	// change selected number of players, never less than 1
	selected_num_players = Math.max(1, selected_num_players + addsub_player);
	
	set_settings_display(true);
}

function set_settings_display(display_settings) {
	let settings_overlay_div = document.getElementById("settings-overlay");
	let settings_div = document.getElementById("settings");
	
	if (display_settings) {
		// show settings
		settings_overlay_div.style.display = "revert";
		settings_div.style.display = "grid";
		
		// highlight correct score selector button
		document.getElementById("settings-button-301").classList.remove("active-modifier");
		document.getElementById("settings-button-501").classList.remove("active-modifier");
		switch(selected_starting_score) {
			case 301:
				document.getElementById("settings-button-301").classList.add("active-modifier");
				break;
			case 501:
				document.getElementById("settings-button-501").classList.add("active-modifier");
				break;
		}
		
		// highlight correct double out selector button
		document.getElementById("settings-button-so").classList.remove("active-modifier");
		document.getElementById("settings-button-do").classList.remove("active-modifier");
		if(selected_double_out) {
			document.getElementById("settings-button-do").classList.add("active-modifier");
		} else {
			document.getElementById("settings-button-so").classList.add("active-modifier");
		}
		
		// show selected number of players
		document.getElementById("player-number").innerText = selected_num_players;
	} else {
		// hide settings
		settings_overlay_div.style.display = "none";
		settings_div.style.display = "none";
	}
}
