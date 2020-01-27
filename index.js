const Banchojs = require("bancho.js");
const client = new Banchojs.BanchoClient(require("./config.json"));

const beatmaps = [75, 1262832, 714001, 1378285, 1385398, 1373950];
let currentBeatmapIndex = 0;
let lobby;
let players;

let deadplayers;



client.connect().then(async () => {
	console.log("We're online!");
	const channel = await client.createLobby("Royale "+Math.random().toString(36).substring(8));
	lobby = channel.lobby;
	const password = Math.random().toString(36).substring(8);
	await Promise.all([lobby.setPassword(password), lobby.setMap(beatmaps[currentBeatmapIndex])]);
	console.log("Lobby created! Name: "+lobby.name+", password: "+password);
    console.log("Multiplayer link: https://osu.ppy.sh/mp/"+lobby.id);
    deadplayers = new Array();
    players = new Array();

    
	lobby.on("playerJoined", (obj) => {
        players.push(obj.player.user.username);
        
        if(obj.player.user.isClient()){
            lobby.setHost("#"+obj.player.user.id);
        }
        if(deadplayers.indexOf(obj.player.user.username) > -1){
                lobby.kickPlayer(obj.player.user.username);
                obj.player.user.sendMessage("Why are you trying to join, huh? You are already dead...")
            }
    });
    
    lobby.on("slotsLocked", () => {
        lobby.setSize(players.length);
        channel.sendMessage("Welcome to the Royale ! 1 life each player, second to lowest player picks next map, last player gets kicked out !");
    })
    
	lobby.on("matchFinished", (scores) => {
		currentBeatmapIndex++;
		if(currentBeatmapIndex == beatmaps.length)
			currentBeatmapIndex = 0;
        lobby.setMap(beatmaps[currentBeatmapIndex]);
        let lowestScore = Number.POSITIVE_INFINITY;
        let lowestPlayer, pickingPlayer;
        for(let scoreId in scores)
			if(scores[scoreId].score < lowestScore){
                if (lowestPlayer != null) { pickingPlayer = lowestPlayer; }
                lowestScore = scores[scoreId].score;
                lowestPlayer = scores[scoreId].player.user.username;
            }
        console.log("Losing player: "+lowestPlayer);
        channel.sendMessage("Player \""+lowestPlayer+"\" is leaving the room in 10 seconds! Good job for keeping it up until now!");
        deadplayers.push(lowestPlayer);
        setTimeout(
            function() {
                lobby.kickPlayer(lowestPlayer);
                lobby.setSize(players.length);
                players = players.filter(e => e == lowestPlayer);
            }, 10000
          );
        channel.sendMessage("It's "+pickingPlayer+"'s turn to pick as they were very close to die here...")
        lobby.setHost(pickingPlayer);
	});
}).catch(console.error);


// closing the multiplayer room
process.on("SIGINT", async () => {
	console.log("Closing lobby and disconnecting...");
	await lobby.closeLobby();
	await client.disconnect();
});