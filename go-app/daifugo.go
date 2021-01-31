package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"sort"
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
	spade   suitType = 0
	heart            = 1
	diamond          = 2
	club             = 3
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
	notDecided titleType = -1
	tycoon               = 0
	rich                 = 1
	commoner             = 2
	poor                 = 3
	beggar               = 4
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

func newTitleType(outOrder int, numPlayer int) titleType {
	if numPlayer == 2 {
		lut := []titleType{rich, poor}
		return lut[outOrder]
	} else if numPlayer == 3 {
		lut := []titleType{rich, commoner, poor}
		return lut[outOrder]
	} else if numPlayer == 4 {
		lut := []titleType{tycoon, rich, poor, beggar}
		return lut[outOrder]
	} else if numPlayer == 5 {
		lut := []titleType{tycoon, rich, commoner, poor, beggar}
		return lut[outOrder]
	} else if numPlayer == 6 {
		lut := []titleType{tycoon, rich, commoner, commoner, poor, beggar}
		return lut[outOrder]
	}
	return notDecided
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

type turnActionType string

const (
	vaildTurn turnActionType = "vaildTurn"
	vaildSkip turnActionType = "vaildSkip"
	invaild                  = "invaild"
)

func (t turnActionType) String() string {
	types := [...]string{"vaildTurn", "vaildSkip", "invaild"}

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
	newHand                          = "newHand"
)

func (t gameActionType) String() string {
	types := [...]string{"invaildGameAction", "nextTurn", "playerOut", "gameOver", "newHand"}

	x := string(t)
	for _, v := range types {
		if v == x {
			return x
		}
	}

	return ""
}

type actionType struct {
	TurnAction    turnActionType `json:"turnAction"`
	GameAction    gameActionType `json:"gameAction"`
	IsSkip        bool           `json:"isSkip"`
	IsRevolution  bool           `json:"isRevolution"`
	NumValidSkips int            `json:"numValidSkips"`
}

func newAction(turnAction turnActionType, gameAction gameActionType, numValidSkips int) actionType {
	a := actionType{}
	a.TurnAction = turnAction
	a.GameAction = gameAction
	a.IsSkip = false
	a.IsRevolution = false
	a.NumValidSkips = numValidSkips
	return a
}

type player struct {
	Name     string    `json:"name"`
	Cards    []card    `json:"cards"`
	MyTurn   bool      `json:"myTurn"`
	Title    titleType `json:"title"`
	OutOrder int       `json:"outOrder"` // -1 if not out.  0 if the first person out etc...
}

func newPlayer(name string) *player {
	p := new(player)
	p.Name = name
	p.Cards = make([]card, 0, 14)
	p.OutOrder = -1
	p.Title = notDecided
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
	outCount       int
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

func (g game) findPlayingPlayerIndex(name string) int {
	for i, p := range g.playingPlayers {
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
	for _, indexToDelete := range toDelete {
		copy(p.Cards[indexToDelete:], p.Cards[indexToDelete+1:]) // Shift p.cards[indexToDelete+1:] left one index.
		p.Cards[len(p.Cards)-1] = card{}                         // Erase last element (write zero value).
		p.Cards = p.Cards[:len(p.Cards)-1]                       // Truncate slice.
	}

	if len(cards) != 0 {
		// add the cards to the top of the pile
		g.pile = append([][]card{cards}, g.pile...)
	}

	if a.GameAction == newHand {
		emptyPile := make([]card, 0)
		g.pile = append([][]card{emptyPile}, g.pile...)
	}

	g.lastAction = a
	if a.IsRevolution {
		g.isRevolution = true
	}

	// give the turn to the next person
	i := g.findPlayingPlayerIndex(p.Name)
	pNext := g.playingPlayers[(i+1)%len(g.playingPlayers)]

	// end this players turn
	p.MyTurn = false
	// remove current player if out
	if a.GameAction == playerOut || a.GameAction == gameOver {
		p.OutOrder = g.outCount
		p.Title = newTitleType(p.OutOrder, len(g.players))
		g.outCount++
		g.removePlayingPlayer(p.Name)
		// remove losing player too if game is over.
		if a.GameAction == gameOver {
			pNext.OutOrder = g.outCount
			pNext.Title = newTitleType(pNext.OutOrder, len(g.players))
			g.outCount++
			g.removePlayingPlayer(pNext.Name)
		}
	}

	// skip player if skipped
	i = g.findPlayingPlayerIndex(pNext.Name)
	if a.IsSkip {
		pNext = g.playingPlayers[(i+1)%len(g.playingPlayers)]
	}

	pNext.MyTurn = true
}

func (g game) tryPlay(p player, cards []card) (actionType, error) {
	invaildAction := newAction(invaild, invaildGameAction, g.lastAction.NumValidSkips+1)

	// you have to have these cards in hand
	err := p.inHand(cards)
	if err != nil {
		return invaildAction, errors.New("invalid move you don't have those cards")
	}

	// you have to have these cards in hand
	if g.lastAction.GameAction == gameOver {
		gameOverAction := newAction(invaild, gameOver, 0)
		return gameOverAction, nil
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
	a := newAction(invaild, retGameAction, g.lastAction.NumValidSkips+1)

	if len(cards) == 4 {
		a.IsRevolution = true
	}

	// If you play 0 cards you could skip your own turn
	if len(cards) == 0 {
		a.TurnAction = vaildSkip
		if g.lastAction.NumValidSkips+2 >= len(g.playingPlayers) {
			a.GameAction = newHand
			a.NumValidSkips = 0
		}
		return a, nil
	}

	// NumValidSkips will be reset to 0
	// as the player is playing some cards
	// as long as the cards played are valid anyways.
	a.NumValidSkips = 0

	// if the top is empty it is valid
	// don't have to worry about pairs of the value
	if len(g.pile) == 0 || len(g.pile[0]) == 0 {
		a.TurnAction = vaildTurn
		return a, nil
	}

	// check to see if the user has a hand full of 2s
	countOf2Like := 0
	for _, c := range cards {
		if c.isLikeA2(g.isRevolution) {
			countOf2Like++
		}
	}

	is2LikeHand := false
	if len(cards) == countOf2Like {
		is2LikeHand = true
	}

	// if the pile and the number of cards
	// are not within one then this is not a vaild action
	if !(len(cards) == len(g.pile[0]) || (len(cards) == len(g.pile[0])-1 && is2LikeHand)) {
		return invaildAction, errors.New("not a matching number of cards")
	}

	// given what is on the top of the pile
	// can you play these cards?
	numFoundGT := 0
	numFoundSame := 0

	for i := range g.pile[0] {
		onpile := g.pile[0][i].Value.getNormalOrder()
		if g.isRevolution {
			onpile = g.pile[0][i].Value.getReverseOrder()
		}
		if i < len(cards) {
			toplay := cards[i].Value.getNormalOrder()
			if g.isRevolution {
				toplay = cards[i].Value.getReverseOrder()
			}
			if onpile < toplay {
				numFoundGT++
			}
			if onpile == toplay {
				numFoundSame++
			}
		}
	}

	numFound := numFoundGT
	if numFoundGT < numFoundSame {
		numFound = numFoundSame
		a.IsSkip = true

		// if you skip and the number of playing players is 2
		// you win the hand
		if 2 == len(g.playingPlayers) {
			a.GameAction = newHand
			a.NumValidSkips = 0
		} else {
			a.NumValidSkips++
		}
	}

	if cards[0].isLikeA2(g.isRevolution) && len(cards) == numFoundGT {
		a.TurnAction = vaildTurn
		return a, nil
	}

	if len(g.pile[0]) == numFound {
		a.TurnAction = vaildTurn
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
	SmallDeck  bool   `json:"smallDeck"`
}

type createGameReturn struct {
	GameName string `json:"gameName"`
}

func addGame(f createGameForm) createGameReturn {
	g := game{}
	if f.Seed == 0 {
		g.rand = rand.New(rand.NewSource(time.Now().UnixNano()))
	} else {
		g.rand = rand.New(rand.NewSource(f.Seed))
	}
	g.lock = &sync.RWMutex{}
	// eat a lot of cards to make games faster to test
	g.state = "notStarted"
	// hack the deck to have less cards for faster
	// testing with 2 players.
	if f.SmallDeck {
		g.deck = make([]card, 16, 16)
		values := []int{2, 3, 12, 13}
		for i := range g.deck {
			g.deck[i].Suit = suitType(i % 4)
			g.deck[i].Value = valueType(values[(i / 4)])
		}
	} else {
		g.deck = make([]card, 52, 52)
		for i := range g.deck {
			g.deck[i].Suit = suitType(i % 4)
			g.deck[i].Value = valueType((i / 4) + 1)
		}
	}
	g.players = make([]*player, f.NumPlayers, f.NumPlayers)
	g.playingPlayers = make([]*player, f.NumPlayers, f.NumPlayers)
	g.rand.Shuffle(len(g.deck), func(i, j int) { g.deck[i], g.deck[j] = g.deck[j], g.deck[i] })
	g.outCount = 0

	gGameLock.Lock()
	defer gGameLock.Unlock()

	// make a world unique game name
	gameNumber := 0
	uniqueGameName := f.GameName
	if _, ok := gGames[f.GameName]; ok {
		for {
			gameNumber++
			uniqueGameName = fmt.Sprintf("%s%d", f.GameName, gameNumber)
			if _, ok := gGames[uniqueGameName]; !ok {
				break
			}
		}
	}

	g.name = uniqueGameName
	player := newPlayer(f.PlayerName)
	g.players[0] = player
	g.playingPlayers[0] = player

	gGames[g.name] = g

	return createGameReturn{g.name}
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

	// sort cards
	for _, p := range g.players {
		sort.SliceStable(p.Cards, func(i, j int) bool {
			vi := int(p.Cards[i].Suit) + (p.Cards[i].Value.getNormalOrder() * 100)
			vj := int(p.Cards[j].Suit) + (p.Cards[j].Value.getNormalOrder() * 100)
			return vi < vj
		})
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
	JustTry    bool   `json:"justTry"`
}

func takeTurn(f takeTurnForm) (actionType, error) {
	action := actionType{}
	var err error
	gGameLock.RLock()
	defer gGameLock.RUnlock()
	g, ok := gGames[f.GameName]
	if !ok {
		return action, errors.New("game does not exist")
	}
	// lock this game. don't let 2 player update
	// this game or something.
	g.lock.Lock()
	defer g.lock.Unlock()
	if g.state != "started" {
		return action, errors.New("Can't take a turn if game is not started")
	}

	p := g.findPlayer(f.PlayerName)
	if p == nil || !p.MyTurn {
		return action, errors.New("bad player")
	}

	action, err = g.tryPlay(*p, f.Cards)
	if err != nil || action.TurnAction == invaild {
		return action, errors.New("invaild move")
	}

	if !f.JustTry {
		g.doAction(p, f.Cards, action)

		// update the global structure
		gGames[f.GameName] = g
	}

	return action, nil
}

func takeTurnPost(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "POST" {
		http.Error(rw, "not a post", 500)
		return
	}

	d := json.NewDecoder(req.Body)
	d.DisallowUnknownFields() // catch unwanted fields

	t := takeTurnForm{}
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
	action, err := takeTurn(t)
	// don't handle the error of bad turn if they just seeing if they can do its
	if err != nil && !t.JustTry {
		// bad JSON or unrecognized json field
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}

	js, err := json.Marshal(action)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)

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
	ret := addGame(t)

	js, err := json.Marshal(ret)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(js)
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
	http.HandleFunc("/takeTurnDaifugoGame", takeTurnPost)
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
