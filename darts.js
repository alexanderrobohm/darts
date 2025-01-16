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
	double_out = params.get("d") != "n";
	
	if (num_players < 1) num_players = 2;
	if (starting_score < 1) starting_score = 2;
	
	// initialize list of winners
	winners = [];
	
	// initialize score
	scores = Array(num_players).fill(starting_score);
	round_scores = Array(num_players).fill(0);
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
		update_score_display(i, true);
	}
	throw_divs = [0,1,2].map((x) => document.getElementById("throw-" + x));
	for (let throw_div of throw_divs) throw_div.innerText = "";

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
			
			document.getElementById("score-button-bull").innerText = "SB";
			document.getElementById("score-button-out").innerText = "Out";
			
			number_prefix = "";
			break;
		case 2:
			document.getElementById("score-button-undo").disabled = true;
			document.getElementById("score-button-bull").disabled = false;
			
			document.getElementById("score-button-x2").classList.add("active-modifier");
			document.getElementById("score-button-x3").classList.remove("active-modifier");
			
			document.getElementById("score-button-bull").innerText = "DB";
			document.getElementById("score-button-out").innerText = "Timo";
			
			number_prefix = "D";
			break;
		case 3:
			document.getElementById("score-button-undo").disabled = true;
			document.getElementById("score-button-bull").disabled = true;
			
			document.getElementById("score-button-x2").classList.remove("active-modifier");
			document.getElementById("score-button-x3").classList.add("active-modifier");
			
			document.getElementById("score-button-out").innerText = "Louis";
			
			number_prefix = "T";
			break;
		
	}
	// set labels of all number buttons
	for (let i = 1; i <= 20; i++) {
		document.getElementById("score-button-" + i).innerText = (number_prefix + i);
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
	if (checkout === undefined || (checkout.split(' ').length > (3 - darts_thrown))) checkout = "";
	checkout_div.innerText = checkout;
	
	scroll_to_player(turn);
}

function update_score(points, button_label) {
	// if first throw of turn, clear throw display
	if (darts_thrown == 0) {
		throw_divs.forEach(function(throw_div) {
			throw_div.classList.remove("throw-last-turn");
			throw_div.innerText = "";
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
			'beginning_score': score_at_beginning_of_round,
			'darts_skipped': 0
		});
	}
	
	game_history[game_history.length-1].darts.push(throw_object);
	
	// subtract thrown points and update throw display
	scores[turn] -= points;
	throw_divs[darts_thrown].innerText = button_label;
	
	darts_thrown++;
	
	let score_thrown_this_round = score_at_beginning_of_round - scores[turn];
	
	// update running statistics
	total_darts_thrown[turn]++;
	
	// was the throw a double?
	let throw_was_double = /^D(B|\d+)$/.test(button_label);
	
	// check if overthrown
	let overthrown = (scores[turn] < 0) || (double_out && ((scores[turn] == 1) || (double_out && !throw_was_double && (scores[turn] == 0))));
	if (overthrown) {
		// bust always counts as three darts for the sake of the statistics
		total_darts_thrown[turn] += (3 - darts_thrown);
		game_history[game_history.length-1].darts_skipped = (3 - darts_thrown);

		// reset score, fill the remaining throws (and round score) with "-" and subtract thrown score from running total
		scores[turn] = score_at_beginning_of_round;
		for (; darts_thrown < 3; darts_thrown++) {
			throw_divs[darts_thrown].innerText = "-";
		}
		round_score_divs[turn].innerText = "-"
	}
	
	// update checkout guide
	checkout = checkouts[scores[turn]];
	if (checkout === undefined || (checkout.split(' ').length > (3 - darts_thrown))) checkout = "";
	checkout_div.innerText = checkout;

	if ((scores[turn] == 0) || (darts_thrown == 3)) {
		rounds_played[turn]++;
	}

	// update score/stats display
	update_score_display(turn, overthrown);
	
	// player wins of remaining score is 0
	let player_won = scores[turn] == 0 && !overthrown;
	if (player_won) {
		winners.push(turn);
		update_score_display(turn, false);
		
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
	total_darts_thrown[history_object.player] -= history_object.darts.length + history_object.darts_skipped;
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
				throw_div.innerText = "";
			});
			
			// and reinitialize the first turn
			set_turn(turn);
			update_score_display(turn, true);
			
			return;
		} else {
			// get last item ln list of rounds, removing it from the array
			history_object = game_history.pop();
		
			// reset statistics
			total_darts_thrown[history_object.player] -= history_object.darts.length + history_object.darts_skipped;
			rounds_played[history_object.player]--;
			scores[history_object.player] = history_object.beginning_score;
			if (winners.indexOf(history_object.player) != -1) winners.pop();

			// replay throws from history object
			set_turn(history_object.player);
			for (let i = 0; i < history_object.darts.length; i++) {
				update_score(history_object.darts[i].value, history_object.darts[i].label);
			}
			
			update_score_display(history_object.player, true);
		}
	} else {
		// replay throws from history object, excluding last dart
		set_turn(history_object.player);
		for (let i = 0; i < history_object.darts.length - 1; i++) {
			update_score(history_object.darts[i].value, history_object.darts[i].label);
		}
		// update display even if no darts are replayed
		if (history_object.darts.length <= 1) {
			update_score_display(history_object.player, true);
		}
	}
	
	update_score_display(current_player, undo_across_rounds);
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

function update_score_display(player_to_update, clear_round_score) {
	if (clear_round_score) {
		round_score_divs[player_to_update].innerText = "-";
	} else {
		round_score_divs[player_to_update].innerText = score_at_beginning_of_round - scores[player_to_update];
	}
	
	if (total_darts_thrown[player_to_update] != 0) {
		darts_divs[player_to_update].innerText = ("\u21A3" + total_darts_thrown[player_to_update]);
	} else {
		darts_divs[player_to_update].innerText = ("\u21A3-");
	}
	
	// update average
	if (total_darts_thrown[player_to_update] > 0) {
		average_divs[player_to_update].innerText = "\u2300" + (3 * (starting_score - scores[player_to_update]) / total_darts_thrown[player_to_update]).toFixed(1);
	} else {
		average_divs[player_to_update].innerText = "\u2300-";
	}
	
	// display player's place if done, score otherwise
	let place = winners.indexOf(player_to_update) + 1;
	if (place > 0) {
		stats_divs[player_to_update].classList.add("winner");
		score_divs[player_to_update].innerText = "#" + place;
	} else {
		stats_divs[player_to_update].classList.remove("winner");
		score_divs[player_to_update].innerText = scores[player_to_update];
	}
}

function get_checkout_list(double_out) {
	if (double_out) {
		return {
			'170': 'T20 T20 DB',
			'167': 'T19 T20 DB',
			'164': 'T18 T20 DB',
			'161': 'T17 T20 DB',
			'160': 'T20 T20 D20',
			'158': 'T20 T20 D19',
			'157': 'T19 T20 D20',
			'156': 'T20 T20 D18',
			'155': 'T19 T20 D19',
			'154': 'T20 T20 D17',
			'153': 'T19 T20 D18',
			'152': 'T20 T20 D16',
			'151': 'T19 T20 D17',
			'150': 'D20 T20 DB',
			'149': 'T19 T20 D16',
			'148': 'T20 T20 D14',
			'147': 'D20 T19 DB',
			'146': 'T20 T20 D13',
			'145': 'T19 T20 D14',
			'144': 'D17 T20 DB',
			'143': 'T19 T20 D13',
			'142': 'T20 T20 D11',
			'141': 'D17 T19 DB',
			'140': 'D20 T20 D20',
			'139': 'T19 T20 D11',
			'138': 'D19 T20 D20',
			'137': 'D20 T19 D20',
			'136': 'D19 T20 D19',
			'135': 'D19 T19 D20',
			'134': 'D17 T20 D20',
			'133': 'D19 T19 D19',
			'132': 'D16 T20 D20',
			'131': 'D17 T19 D20',
			'130': 'D16 T20 D19',
			'129': 'D16 T19 D20',
			'128': 'D14 T20 D20',
			'127': 'D16 T19 D19',
			'126': 'D13 T20 D20',
			'125': 'D14 T19 D20',
			'124': 'D13 T20 D19',
			'123': 'D13 T19 D20',
			'122': 'D11 T20 D20',
			'121': 'D13 T19 D19',
			'120': 'D20 D20 D20',
			'119': '19 T20 D20',
			'118': 'D19 D20 D20',
			'117': '17 T20 D20',
			'116': 'D19 D19 D20',
			'115': '17 T20 D19',
			'114': '17 T19 D20',
			'113': '13 T20 D20',
			'112': '17 T19 D19',
			'111': '11 T20 D20',
			'110': 'T20 DB',
			'109': '11 T20 D19',
			'108': '11 T19 D20',
			'107': 'T19 DB',
			'106': '11 T19 D19',
			'105': '5 T20 D20',
			'104': 'T18 DB',
			'103': '5 T20 D19',
			'102': '5 T19 D20',
			'101': 'T17 DB',
			'100': 'T20 D20',
			'99': '19 D20 D20',
			'98': 'T20 D19',
			'97': 'T19 D20',
			'96': 'T20 D18',
			'95': 'T19 D19',
			'94': 'T20 D17',
			'93': 'T19 D18',
			'92': 'T20 D16',
			'91': 'T19 D17',
			'90': 'D20 DB',
			'89': 'T19 D16',
			'88': 'T20 D14',
			'87': 'T17 D18',
			'86': 'T20 D13',
			'85': 'T19 D14',
			'84': 'D17 DB',
			'83': 'T19 D13',
			'82': 'T20 D11',
			'81': 'T15 D18',
			'80': 'D20 D20',
			'79': 'T19 D11',
			'78': 'D19 D20',
			'77': 'T19 D10',
			'76': 'D19 D19',
			'75': 'SB DB',
			'74': 'D17 D20',
			'73': 'T19 D8',
			'72': 'D16 D20',
			'71': 'T19 D7',
			'70': 'D16 D19',
			'69': '19 DB',
			'68': 'D14 D20',
			'67': '17 DB',
			'66': 'D13 D20',
			'65': 'SB D20',
			'64': 'D13 D19',
			'63': '13 DB',
			'62': 'D11 D20',
			'61': '11 DB',
			'60': '20 D20',
			'59': '19 D20',
			'58': '20 D19',
			'57': '17 D20',
			'56': '16 D20',
			'55': '17 D19',
			'54': '14 D20',
			'53': '13 D20',
			'52': '14 D19',
			'51': '11 D20',
			'50': 'DB',
			'49': '11 D19',
			'48': '8 D20',
			'47': '7 D20',
			'46': '8 D19',
			'45': '5 D20',
			'44': '4 D20',
			'43': '5 D19',
			'42': '2 D20',
			'41': '1 D20',
			'40': 'D20',
			'39': '1 D19',
			'38': 'D19',
			'37': '5 D16',
			'36': 'D18',
			'35': '1 D17',
			'34': 'D17',
			'33': '1 D16',
			'32': 'D16',
			'31': '5 D13',
			'30': 'D15',
			'29': '1 D14',
			'28': 'D14',
			'27': '1 D13',
			'26': 'D13',
			'25': '5 D10',
			'24': 'D12',
			'23': '1 D11',
			'22': 'D11',
			'21': '1 D10',
			'20': 'D10',
			'19': '5 D7',
			'18': 'D9',
			'17': '1 D8',
			'16': 'D8',
			'15': '1 D7',
			'14': 'D7',
			'13': '5 D4',
			'12': 'D6',
			'11': '1 D5',
			'10': 'D5',
			'9': '1 D4',
			'8': 'D4',
			'7': '5 D1',
			'6': 'D3',
			'5': '1 D2',
			'4': 'D2',
			'3': '1 D1',
			'2': 'D1'
		};
	} else {
		return {
			'180': 'T20 T20 T20',
			'177': 'T19 T20 T20',
			'174': 'T18 T20 T20',
			'171': 'T17 T20 T20',
			'170': 'T20 T20 DB',
			'168': 'T16 T20 T20',
			'167': 'T19 T20 DB',
			'165': 'T15 T20 T20',
			'164': 'T18 T20 DB',
			'162': 'T14 T20 T20',
			'161': 'T17 T20 DB',
			'160': 'D20 T20 T20',
			'159': 'T13 T20 T20',
			'158': 'D19 T20 T20',
			'157': 'D20 T19 T20',
			'156': 'D18 T20 T20',
			'155': 'D19 T19 T20',
			'154': 'D17 T20 T20',
			'153': 'D18 T19 T20',
			'152': 'D16 T20 T20',
			'151': 'D17 T19 T20',
			'150': 'D20 T20 DB',
			'149': 'D16 T19 T20',
			'148': 'D14 T20 T20',
			'147': 'D20 T19 DB',
			'146': 'D13 T20 T20',
			'145': 'D14 T19 T20',
			'144': 'D17 T20 DB',
			'143': 'D13 T19 T20',
			'142': 'D11 T20 T20',
			'141': 'D17 T19 DB',
			'140': 'D20 D20 T20',
			'139': '19 T20 T20',
			'138': 'D19 D20 T20',
			'137': '17 T20 T20',
			'136': 'D19 D19 T20',
			'135': 'D19 D20 T19',
			'134': '17 T19 T20',
			'133': '13 T20 T20',
			'132': 'D16 D20 T20',
			'131': '11 T20 T20',
			'130': '13 T19 T20',
			'129': 'D16 D20 T19',
			'128': '11 T19 T20',
			'127': '7 T20 T20',
			'126': 'D13 D20 T20',
			'125': '5 T20 T20',
			'124': '7 T19 T20',
			'123': 'D13 D20 T19',
			'122': '5 T19 T20',
			'121': '1 T20 T20',
			'120': 'T20 T20',
			'119': '19 D20 T20',
			'118': 'D19 D20 D20',
			'117': 'T19 T20',
			'116': 'D19 D19 D20',
			'115': '17 D19 T20',
			'114': 'T18 T20',
			'113': '13 D20 T20',
			'112': '17 D19 T19',
			'111': 'T17 T20',
			'110': 'T20 DB',
			'109': '11 D19 T20',
			'108': 'T16 T20',
			'107': 'T19 DB',
			'106': '11 D19 T19',
			'105': 'T15 T20',
			'104': 'T18 DB',
			'103': '5 D19 T20',
			'102': 'T14 T20',
			'101': 'T17 DB',
			'100': 'D20 T20',
			'99': 'T13 T20',
			'98': 'D19 T20',
			'97': 'D20 T19',
			'96': 'D18 T20',
			'95': 'D19 T19',
			'94': 'D17 T20',
			'93': 'D18 T19',
			'92': 'D16 T20',
			'91': 'D17 T19',
			'90': 'D20 DB',
			'89': 'D16 T19',
			'88': 'D14 T20',
			'87': 'D15 T19',
			'86': 'D13 T20',
			'85': 'D14 T19',
			'84': 'D17 DB',
			'83': 'D13 T19',
			'82': 'D11 T20',
			'81': 'D12 T19',
			'80': 'D20 D20',
			'79': '19 T20',
			'78': 'D19 D20',
			'77': '17 T20',
			'76': 'D19 D19',
			'75': 'SB DB',
			'74': '17 T19',
			'73': '13 T20',
			'72': 'D16 D20',
			'71': '11 T20',
			'70': '13 T19',
			'69': '19 DB',
			'68': '11 T19',
			'67': '7 T20',
			'66': 'D13 D20',
			'65': '5 T20',
			'64': '7 T19',
			'63': '13 DB',
			'62': '5 T19',
			'61': '1 T20',
			'60': 'T20',
			'59': '19 D20',
			'58': '1 T19',
			'57': 'T19',
			'56': '5 T17',
			'55': '17 D19',
			'54': 'T18',
			'53': '13 D20',
			'52': '1 T17',
			'51': 'T17',
			'50': 'DB',
			'49': '11 D19',
			'48': 'T16',
			'47': '7 D20',
			'46': '1 T15',
			'45': 'T15',
			'44': '5 T13',
			'43': '5 D19',
			'42': 'T14',
			'41': '1 D20',
			'40': 'D20',
			'39': 'T13',
			'38': 'D19',
			'37': '5 D16',
			'36': 'D18',
			'35': '1 D17',
			'34': 'D17',
			'33': 'T11',
			'32': 'D16',
			'31': '5 D13',
			'30': 'D15',
			'29': '1 D14',
			'28': 'D14',
			'27': 'T9',
			'26': 'D13',
			'25': 'SB',
			'24': 'D12',
			'23': '1 D11',
			'22': 'D11',
			'21': 'T7',
			'20': '20',
			'19': '19',
			'18': '18',
			'17': '17',
			'16': '16',
			'15': '15',
			'14': '14',
			'13': '13',
			'12': '12',
			'11': '11',
			'10': '10',
			'9': '9',
			'8': '8',
			'7': '7',
			'6': '6',
			'5': '5',
			'4': '4',
			'3': '3',
			'2': '2',
			'1': '1'
		};
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
		
		// reset settings to current values
		selected_starting_score = starting_score;
		selected_double_out = double_out;
		selected_num_players = num_players;
	}
}
