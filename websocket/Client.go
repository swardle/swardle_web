package websocket

import (
	"fmt"
	"log"

	"github.com/gorilla/websocket"
)

// Client will track each web client web socket connection
type Client struct {
	ID   string
	Conn *websocket.Conn
	Pool *Pool
}

// Message a json message
type Message struct {
	Type int    `json:"type"`
	Body string `json:"body"`
}

// Read any message sent from a client and broadcast it to all other clients in the pool
func (c *Client) Read() {
	defer func() {
		c.Pool.Unregister <- c
		c.Conn.Close()
	}()

	for {
		messageType, p, err := c.Conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}
		message := Message{Type: messageType, Body: string(p)}
		c.Pool.Broadcast <- message
		fmt.Printf("Message Received: %+v\n", message)
	}
}
