package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/swardle/swardle_web/pkg/websocket"
)

func serveWs(pool *websocket.Pool, w http.ResponseWriter, r *http.Request) {
	fmt.Println("WebSocket Endpoint Hit")
	conn, err := websocket.Upgrade(w, r)
	if err != nil {
		fmt.Fprintf(w, "%+v\n", err)
	}

	client := &websocket.Client{
		Conn: conn,
		Pool: pool,
	}

	pool.Register <- client
	client.Read()
}

type stateType string

const (
	started    stateType = "started"
	notStarted           = "notStarted"
)

func (t stateType) IsValid() error {
	switch t {
	case started, notStarted:
		return nil
	}
	return errors.New("Invalid stateType")
}

func (t stateType) String() string {
	types := [...]string{"started", "notStarted"}

	x := string(t)
	for _, v := range types {
		if v == x {
			return x
		}
	}

	return ""
}

type suitType int

const (
	spade   suitType = 1
	heart            = 3
	diamond          = 2
	club             = 0
)

func (t suitType) String() string {
	switch t {
	case club:
		return "club"
	case spade:
		return "spade"
	case diamond:
		return "diamond"
	case heart:
		return "heart"
	}
	return ""
}

type valueType int

func (t valueType) String() string {
	switch {
	case t == 1:
		return "ace"
	case 2 <= t && t <= 10:
		return strconv.Itoa(int(t))
	case t == 11:
		return "jack"
	case t == 12:
		return "queen"
	case t == 13:
		return "king"
	}
	return ""
}

func (t valueType) getReverseOrder() int {
	switch {
	case t == 1:
		return 4 // ace is 2nd weakest (like 4 was)
	case t == 2:
		return 3 // 2 is weakest (like 3 was)
	case t == 3:
		return 15 // strongest (like 2 was)
	case t == 4:
		return 14 // 2nd strongest (like ace was)
	case 5 <= t && t <= 13:
		return 18 - int(t) // 13 = 5 (3rd weakest), 5 = 13 (like king)
	}
	return 0
}

func (t valueType) getNormalOrder() int {
	switch {
	case t == 1:
		return 14 // aces beats king
	case t == 2:
		return 15 // 2 beats 2 aces
	case 3 <= t && t <= 13:
		return int(t)
	}
	return 0
}

type titleType int

const (
	notDecided titleType = 0
	beggar               = 1
	poor                 = 2
	commoner             = 3
	rich                 = 4
	tycoon               = 5
)

func (t titleType) getTitle() string {
	switch t {
	case notDecided:
		return "notDecided"
	case beggar:
		return "beggar"
	case poor:
		return "poor"
	case commoner:
		return "commoner"
	case rich:
		return "rich"
	case tycoon:
		return "tycoon"
	}
	return ""
}

type card struct {
	Suit  suitType  `json:"suit"`
	Value valueType `json:"value"`
}

func (c card) is3OfClubs() bool {
	return c.Value == 2 && c.Suit == club
}

func (c card) isLikeA2(isRevolution bool) bool {
	if isRevolution {
		return c.Value == 3
	}
	return c.Value == 2
}

func (c card) isSame(b card) bool {
	return c.Value == b.Value && c.Suit == b.Suit
}

type player struct {
	Name   string    `json:"name"`
	Cards  []card    `json:"cards"`
	MyTurn bool      `json:"myTurn"`
	Title  titleType `json:"title"`
	IsOut  bool      `json:"isOut"`
}

func newPlayer(name string) *player {
	p := new(player)
	p.Name = name
	p.Cards = make([]card, 0, 14)
	return p
}

func (p player) inHand(cards []card) error {
	// do you have these cards in your hand
	numFound := 0
	for _, inhand := range p.Cards {
		for _, toplay := range cards {
			if inhand.isSame(toplay) {
				numFound++
			}
		}
	}
	if len(cards) == numFound {
		return nil
	}
	return errors.New("cards to play are not in hand")
}

type turnActionType string

const (
	vaild   turnActionType = "vaild"
	invaild                = "invaild"
)

func (t turnActionType) String() string {
	types := [...]string{"vaild", "invaild"}

	x := string(t)
	for _, v := range types {
		if v == x {
			return x
		}
	}

	return ""
}

type gameActionType string

const (
	invaildGameAction gameActionType = "invaildGameAction"
	nextTurn                         = "nextTurn"
	playerOut                        = "playerOut"
	gameOver                         = "gameOver"
)

func (t gameActionType) String() string {
	types := [...]string{"invaildGameAction", "nextTurn", "playerOut", "gameOver"}

	x := string(t)
	for _, v := range types {
		if v == x {
			return x
		}
	}

	return ""
}

type actionType struct {
	TurnAction   turnActionType `json:"turnAction"`
	GameAction   gameActionType `json:"gameAction"`
	IsSkip       bool           `json:"isSkip"`
	IsRevolution bool           `json:"isRevolution"`
}

func newAction(turnAction turnActionType, gameAction gameActionType) actionType {
	a := actionType{}
	a.TurnAction = turnAction
	a.GameAction = gameAction
	a.IsSkip = false
	a.IsRevolution = false
	return a
}

type game struct {
	name           string
	state          stateType // started or notStarted
	rand           *rand.Rand
	players        []*player
	playingPlayers []*player
	deck           []card
	pile           [][]card
	lock           *sync.RWMutex
	isRevolution   bool
	lastAction     actionType
}

func (g game) countPlayer() int {
	numPlayers := 0
	for _, p := range g.players {
		if p != nil {
			numPlayers++
		}
	}
	return numPlayers
}

func (g game) findPlayer(name string) *player {
	for _, p := range g.players {
		if p != nil && p.Name == name {
			return p
		}
	}
	return nil
}

func (g game) findPlayerIndex(name string) int {
	for i, p := range g.players {
		if p != nil && p.Name == name {
			return i
		}
	}
	return -1
}

func (g *game) removePlayingPlayer(name string) {
	for i, p := range g.playingPlayers {
		if p != nil && p.Name == name {
			copy(g.playingPlayers[i:], g.playingPlayers[i+1:])            // Shift p.cards[i+1:] left one index.
			g.playingPlayers[len(g.playingPlayers)-1] = nil               // Erase last element (write zero value).
			g.playingPlayers = g.playingPlayers[:len(g.playingPlayers)-1] // Truncate slice.
			return
		}
	}
}

func (g *game) doAction(p *player, cards []card, a actionType) {

	// remove the cards played
	// find the indexs of the cards to delete
	toDelete := make([]int, 0, 4)
	for i, inhand := range p.Cards {
		for _, toplay := range cards {
			if inhand.isSame(toplay) {
				toDelete = append(toDelete, i)
			}
		}
	}

	// reverse to delete highest index first
	for i, j := 0, len(toDelete)-1; i < j; i, j = i+1, j-1 {
		toDelete[i], toDelete[j] = toDelete[j], toDelete[i]
	}

	// delete the items from the players hand
	for i := range p.Cards {
		copy(p.Cards[i:], p.Cards[i+1:])   // Shift p.cards[i+1:] left one index.
		p.Cards[len(p.Cards)-1] = card{}   // Erase last element (write zero value).
		p.Cards = p.Cards[:len(p.Cards)-1] // Truncate slice.
	}

	// add the cards to the top of the pile
	g.pile = append([][]card{cards}, g.pile...)

	g.lastAction = a
	if a.IsRevolution {
		g.isRevolution = true
	}

	// give the turn to the next person
	i := g.findPlayerIndex(p.Name)
	pNext := g.playingPlayers[(i+1)%len(g.playingPlayers)]

	// end this players turn
	p.MyTurn = false
	// remove current player if out
	if a.GameAction == playerOut {
		p.IsOut = true
		g.removePlayingPlayer(p.Name)
	}

	// skip player if skipped
	i = g.findPlayerIndex(pNext.Name)
	if a.IsSkip {
		pNext = g.playingPlayers[(i+1)%len(g.playingPlayers)]
	}

	pNext.MyTurn = true
}

func (g game) tryPlay(p player, cards []card) (actionType, error) {
	invaildAction := newAction(invaild, invaildGameAction)
	err := p.inHand(cards)
	if err != nil {
		return invaildAction, errors.New("invalid move you don't have those cards")
	}

	// check if all cards are same value
	for _, a := range cards {
		for _, b := range cards {
			if a.Value != b.Value {
				return invaildAction, errors.New("all cards must be same value")
			}
		}
	}

	retGameAction := gameActionType(nextTurn)
	if len(cards) == len(p.Cards) {
		retGameAction = playerOut
		if len(g.playingPlayers) == 2 {
			retGameAction = gameOver
		}
	}
	a := newAction(invaild, retGameAction)

	if len(cards) == 4 {
		a.IsRevolution = true
	}
	// if the top is empty it is valid
	// don't have to worry about pairs of the value
	if len(g.pile[0]) == 0 {
		a.TurnAction = vaild
	}

	// given what is on the top of the pile
	// can you play these cards?
	numFoundGT := 0
	numFoundSame := 0
	for _, onpile := range g.pile[0] {
		for _, toplay := range cards {
			if onpile.Value < toplay.Value {
				numFoundGT++
			}
			if onpile.Value == toplay.Value {
				numFoundSame++
			}
		}
	}

	numFound := numFoundGT
	if numFoundGT < numFoundSame {
		numFound = numFoundSame
		a.IsSkip = true
	}

	if cards[0].isLikeA2(g.isRevolution) {
		if len(cards) == numFound-1 {
			a.TurnAction = vaild
		}
	} else if len(cards) == numFound {
		a.TurnAction = vaild
	}

	if a.TurnAction == vaild {
		return a, nil
	}

	return invaildAction, errors.New("all cards must be same value")
}

type nameList struct {
	Data []string `json:"data"`
}

var (
	gGames            map[string]game = make(map[string]game)
	gGameLock         sync.RWMutex
	gMaleFirstNames   nameList
	gFemaleFirstNames nameList
	gSurnames         nameList
)

type createGameForm struct {
	GameName   string `json:"gameName"`
	PlayerName string `json:"playerName"`
	NumPlayers int    `json:"numPlayers"`
	Seed       int64  `json:"seed"`
}

func addGame(f createGameForm) error {
	g := game{}
	if f.Seed == 0 {
		g.rand = rand.New(rand.NewSource(time.Now().UnixNano()))
	} else {
		g.rand = rand.New(rand.NewSource(f.Seed))
	}
	g.lock = &sync.RWMutex{}
	g.name = f.GameName
	g.deck = make([]card, 52, 52)
	g.state = "notStarted"
	for i := range g.deck {
		g.deck[i].Suit = suitType(i % 4)
		g.deck[i].Value = valueType((i / 4) + 1)
	}
	g.players = make([]*player, f.NumPlayers, f.NumPlayers)
	g.playingPlayers = make([]*player, f.NumPlayers, f.NumPlayers)
	g.rand.Shuffle(len(g.deck), func(i, j int) { g.deck[i], g.deck[j] = g.deck[j], g.deck[i] })
	gGameLock.Lock()
	defer gGameLock.Unlock()

	if _, ok := gGames[g.name]; ok {
		return errors.New("game exists")
	}
	player := newPlayer(f.PlayerName)
	g.players[0] = player
	g.playingPlayers[0] = player

	gGames[g.name] = g

	return nil
}

type killGameForm struct {
	Name string `json:"name"`
}

func killGame(f killGameForm) error {
	gGameLock.Lock()
	defer gGameLock.Unlock()
	_, ok := gGames[f.Name]
	if !ok {
		return errors.New("game does not exist")
	}
	delete(gGames, f.Name)
	return nil
}

type joinGameForm struct {
	GameName   string `json:"gameName"`
	PlayerName string `json:"playerName"`
}

func joinGame(f joinGameForm) error {
	// take a read lock to make sure you can't remove a
	// game but you can update 2 games at a time.
	gGameLock.RLock()
	defer gGameLock.RUnlock()
	g, ok := gGames[f.GameName]
	if !ok {
		return errors.New("game does not exist")
	}
	// lock this game. don't let 2 player update
	// this game or something.
	g.lock.Lock()
	defer g.lock.Unlock()

	if g.state != "notStarted" {
		return errors.New("Can't add player once started")
	}

	if g.findPlayer(f.PlayerName) != nil {
		return errors.New("Can't add player with the same name")
	}

	foundFree := false
	player := newPlayer(f.PlayerName)
	for i, p := range g.players {
		if p == nil {
			g.players[i] = player
			g.playingPlayers[i] = player
			foundFree = true
			break
		}
	}

	if !foundFree {
		return errors.New("No free slots for players")
	}

	pcount := g.countPlayer()
	if pcount == len(g.players) {
		g.startGame()
	}

	// update the global structure
	gGames[f.GameName] = g
	return nil
}

type quitGameForm struct {
	GameName   string `json:"gameName"`
	PlayerName string `json:"playerName"`
}

func quitGame(f quitGameForm) error {
	// take a read lock to make sure you can't remove a
	// game but you can update 2 games at a time.
	gGameLock.RLock()

	g, ok := gGames[f.GameName]
	if !ok {
		return errors.New("game does not exist")
	}
	// lock this game. don't let 2 player update
	// this game or something.
	g.lock.Lock()

	numPlayers := 0
	found := false
	for i, p := range g.players {
		if p != nil {
			numPlayers++
		}
		if p != nil && p.Name == f.PlayerName {
			g.players[i] = nil
			g.playingPlayers[i] = nil
			found = true
			numPlayers--
		}
	}

	g.lock.Unlock()
	gGameLock.RUnlock()

	if !found {
		return errors.New("Can't find player")
	}

	if numPlayers == 0 {
		kf := killGameForm{}
		kf.Name = f.GameName
		killGame(kf)
	}

	return nil
}

func (g *game) startGame() error {
	if g.state != "notStarted" {
		return errors.New("Can't start game once started")
	}

	// deal all cards out.
	i := 0
	numPlayer := len(g.players)
	for len(g.deck) != 0 {
		// give card to right player
		p := g.players[i%numPlayer]
		c := g.deck[len(g.deck)-1]
		p.Cards = append(p.Cards, c)
		// Truncate slice
		g.deck = g.deck[:len(g.deck)-1]
		i++
	}

	// find who has the 3 of clubs
	// it will be his turn
	for _, p := range g.players {
		for _, c := range p.Cards {
			if c.is3OfClubs() {
				p.MyTurn = true
				break
			}
		}
	}

	g.state = started

	return nil
}

type takeTurnForm struct {
	GameName   string `json:"gameName"`
	PlayerName string `json:"playerName"`
	Cards      []card `json:"cards"`
}

func takeTurn(f takeTurnForm) error {
	gGameLock.RLock()
	defer gGameLock.RUnlock()
	g, ok := gGames[f.GameName]
	if !ok {
		return errors.New("game does not exist")
	}
	// lock this game. don't let 2 player update
	// this game or something.
	g.lock.Lock()
	defer g.lock.Unlock()
	if g.state != "notStarted" {
		return errors.New("Can't remove player once started")
	}

	if g.state != "notStarted" {
		return errors.New("Can't start game once started")
	}

	p := g.findPlayer(f.PlayerName)
	if p == nil || !p.MyTurn {
		return errors.New("bad player")
	}

	action, err := g.tryPlay(*p, f.Cards)
	if err != nil || action.TurnAction == invaild {
		return errors.New("invaild move")
	}

	g.doAction(p, f.Cards, action)

	// update the global structure
	gGames[f.GameName] = g

	return nil
}

func killGamePost(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "POST" {
		http.Error(rw, "not a post", 500)
		return
	}

	d := json.NewDecoder(req.Body)
	d.DisallowUnknownFields() // catch unwanted fields

	t := killGameForm{}
	err := d.Decode(&t)
	if err != nil {
		// bad JSON or unrecognized json field
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}
	// optional extra check
	if d.More() {
		http.Error(rw, "extraneous data after JSON object", http.StatusBadRequest)
		return
	}

	// got the input we expected: no more, no less
	err = killGame(t)
	if err != nil {
		// bad JSON or unrecognized json field
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}
}

func joinGamePost(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "POST" {
		http.Error(rw, "not a post", 500)
		return
	}

	d := json.NewDecoder(req.Body)
	d.DisallowUnknownFields() // catch unwanted fields

	t := joinGameForm{}
	err := d.Decode(&t)
	if err != nil {
		// bad JSON or unrecognized json field
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}
	// optional extra check
	if d.More() {
		http.Error(rw, "extraneous data after JSON object", http.StatusBadRequest)
		return
	}

	// got the input we expected: no more, no less
	joinGame(t)
}

func addGamePost(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "POST" {
		http.Error(rw, "not a post", 500)
		return
	}

	d := json.NewDecoder(req.Body)
	// bytes, err := ioutil.ReadAll(req.Body)
	// fmt.Println(string(bytes))
	d.DisallowUnknownFields() // catch unwanted fields

	t := createGameForm{}
	err := d.Decode(&t)
	if err != nil {
		// bad JSON or unrecognized json field
		fmt.Println(err.Error())
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}
	// optional extra check
	if d.More() {
		http.Error(rw, "extraneous data after JSON object", http.StatusBadRequest)
		return
	}

	// got the input we expected: no more, no less
	addGame(t)
}

type gameJSON struct {
	Name       string `json:"name"`
	State      string `json:"state"`
	NumPlayers int    `json:"numPlayers"`
	MaxPlayers int    `json:"maxPlayers"`
}

func getGames(w http.ResponseWriter, r *http.Request) {
	games := make([]gameJSON, 0, 4)
	gGameLock.RLock()
	defer gGameLock.RUnlock()

	for _, g := range gGames {
		newgame := gameJSON{}

		g.lock.RLock()
		newgame.Name = g.name
		newgame.State = g.state.String()
		newgame.MaxPlayers = len(g.players)

		numPlayers := 0
		for _, p := range g.players {
			if p != nil {
				numPlayers++
			}
		}
		newgame.NumPlayers = numPlayers
		g.lock.RUnlock()

		games = append(games, newgame)
	}

	js, err := json.Marshal(games)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(js)
}

type nameJSON struct {
	Name string `json:"name"`
}

func getRadomName(w http.ResponseWriter, r *http.Request) {
	maleOrFemale := rand.Intn(1)
	firstNames := gMaleFirstNames
	if maleOrFemale == 1 {
		firstNames = gFemaleFirstNames
	}

	n := len(gSurnames.Data)
	s := rand.Intn(n)
	n = len(firstNames.Data)
	f := rand.Intn(n)

	name := nameJSON{}
	name.Name = firstNames.Data[f] + " " + gSurnames.Data[s]

	js, err := json.Marshal(name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(js)
}

type allGameDataForm struct {
	PlayerName string `json:"playerName"`
	GameName   string `json:"gameName"`
}

type allGameDataJSON struct {
	Name           string     `json:"name"`
	State          string     `json:"state"`
	Players        []player   `json:"players"`
	PlayingPlayers []player   `json:"playingPlayers"`
	Deck           []card     `json:"deck"`
	Pile           [][]card   `json:"pile"`
	IsRevolution   bool       `json:"isRevolution"`
	LastAction     actionType `json:"lastAction"`
}

func getLoadAllGameDataHelper(t allGameDataForm, g game) allGameDataJSON {
	ret := allGameDataJSON{}
	ret.Name = g.name
	ret.State = g.state.String()
	ret.Players = make([]player, 0, 6)
	ret.PlayingPlayers = make([]player, 0, 6)
	ret.Deck = make([]card, 0, 52)
	ret.Pile = make([][]card, 0, 40)

	for _, p := range g.players {
		if p != nil {
			ret.Players = append(ret.Players, *p)
		}
	}
	for _, p := range g.playingPlayers {
		if p != nil {
			ret.PlayingPlayers = append(ret.PlayingPlayers, *p)
		}
	}
	for _, c := range g.deck {
		ret.Deck = append(ret.Deck, c)
	}
	for _, c := range g.pile {
		ret.Pile = append(ret.Pile, c)
	}
	ret.IsRevolution = g.isRevolution
	ret.LastAction = g.lastAction
	return ret
}

func getLoadAllGameData(w http.ResponseWriter, r *http.Request) {

	if r.Method != "POST" {
		http.Error(w, "not a post", 500)
		return
	}

	bytes, err := ioutil.ReadAll(r.Body)
	fmt.Println(string(bytes))

	t := allGameDataForm{}
	// err := d.Decode(&t)
	err = json.Unmarshal(bytes, &t)
	if err != nil {
		// bad JSON or unrecognized json field
		fmt.Println(err.Error())
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	gGameLock.RLock()
	defer gGameLock.RUnlock()

	ret := allGameDataJSON{}

	for _, g := range gGames {
		g.lock.RLock()

		if g.name == t.GameName {
			ret = getLoadAllGameDataHelper(t, g)
			g.lock.RUnlock()
			break
		}

		g.lock.RUnlock()
	}

	js, err := json.Marshal(ret)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(js)
}

// StartDaifugoServer add the daifugo webserver hooks
func StartDaifugoServer() {

	data, err := ioutil.ReadFile("./static/js/names-male.json")
	err = json.Unmarshal(data, &gMaleFirstNames)
	if err != nil {
		fmt.Print(err)
	}

	data, err = ioutil.ReadFile("./static/js/names-female.json")
	err = json.Unmarshal(data, &gFemaleFirstNames)
	if err != nil {
		fmt.Print(err)
	}

	data, err = ioutil.ReadFile("./static/js/names-surnames.json")
	err = json.Unmarshal(data, &gSurnames)
	if err != nil {
		fmt.Print(err)
	}

	http.HandleFunc("/createDaifugoGame", addGamePost)
	http.HandleFunc("/joinDaifugoGame", joinGamePost)
	http.HandleFunc("/killDaifugoGame", killGamePost)
	http.HandleFunc("/daifugoGames.json", getGames)
	http.HandleFunc("/randomName.json", getRadomName)
	http.HandleFunc("/daifugoLoadAllGameData.json", getLoadAllGameData)
	// broadcast messages
	pool := websocket.NewPool()
	go pool.Start()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(pool, w, r)
	})
}
