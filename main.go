package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	secretmanager "cloud.google.com/go/secretmanager/apiv1"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	secretmanagerpb "google.golang.org/genproto/googleapis/cloud/secretmanager/v1"
)

func addSecretsToEnv() error {
	// Create the client.
	ctx := context.Background()
	client, err := secretmanager.NewClient(ctx)
	if err != nil {
		return fmt.Errorf("failed to create secretmanager client: %v", err)
	}

	// Build the request.
	req := &secretmanagerpb.AccessSecretVersionRequest{
		Name: "projects/694671698910/secrets/SENDGRID_API_KEY/versions/latest",
	}

	// Call the API.
	result, err := client.AccessSecretVersion(ctx, req)
	if err != nil {
		fmt.Printf("failed to access secret version: %v", err)
		return fmt.Errorf("failed to access secret version: %v", err)
	}

	os.Setenv("SENDGRID_API_KEY", string(result.Payload.Data))
	return nil
}

type contactForm struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Subject string `json:"subject"`
	Message string `json:"message"`
}

func sendHandle(rw http.ResponseWriter, req *http.Request) {
	if req.Method != "POST" {
		http.Error(rw, "not a post", 500)
		return
	}

	if err := req.ParseForm(); err != nil {
		http.Error(rw, "ParseForm failed", 500)
		return
	}
	var c contactForm

	c.Name = req.FormValue("name")
	c.Email = req.FormValue("email")
	c.Subject = req.FormValue("subject")
	c.Message = req.FormValue("message")

	// this function returns the present time
	now := time.Now()
	// try to use PST
	location, err := time.LoadLocation("America/Los_Angeles")
	if err == nil {
		now = now.In(location)
	}

	datestr := fmt.Sprintf(now.Format("2006-01-02 at 15:04:05"))

	msg := ""
	msg += fmt.Sprintf("Message from Portfolio site.  Submitted on %s.\n\n", datestr)

	prettyJSON, err := json.MarshalIndent(c, "", "    ")
	if err != nil {
		errstr := fmt.Sprintf("%v", err)
		http.Error(rw, "Failed to generate json "+errstr, 500)
	}
	msg += string(prettyJSON)

	from := mail.NewEmail("FormMailer", "FormMailer@swardle.com")
	subject := "Message from Scott's Website"
	to := mail.NewEmail("Scott Wardle", "swardle@gmail.com")

	message := mail.NewSingleEmail(from, subject, to, msg, msg)
	client := sendgrid.NewSendClient(os.Getenv("SENDGRID_API_KEY"))
	response, err := client.Send(message)
	if err != nil {
		log.Println(err)
	} else {
		fmt.Println(response.StatusCode)
		fmt.Println(response.Body)
		fmt.Println(response.Headers)
	}

	http.Redirect(rw, req, "thanks.html", http.StatusSeeOther)
}

// Certificate is saved at: /etc/letsencrypt/live/swardle.com/fullchain.pem
// Key is saved at:         /etc/letsencrypt/live/swardle.com/privkey.pem

var certPaths []string = []string{
	"/etc/letsencrypt/live/swardle.com/",
}

type IHandler struct{}
type SHandler struct{}

func (ih IHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	hostDomain := strings.Split(r.Host, ":")[0]
	newPath := "https://" + hostDomain + ":8181" + r.URL.Path
	fmt.Printf("old=%s\nnew=%s\n", r.Host, newPath)
	http.Redirect(w, r, newPath, 302)
}

func (sh SHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "I hope you are feeling secure now you are here")
}

func main() {
	// Disable log prefixes such as the default timestamp.
	// Prefix text prevents the message from being parsed as JSON.
	// A timestamp is added when shipping logs to Cloud Logging.
	log.SetFlags(0)
	// using "GOOGLE_APPLICATION_CREDENTIALS" on windows
	apikey := os.Getenv("SENDGRID_API_KEY")
	if apikey == "" {
		addSecretsToEnv()
	}

	// process Certificate for ssl/https
	tlsConf := &tls.Config{}

	for _, v := range certPaths {
		certFile := path.Join(v, "fullchain.pem")
		keyFile := path.Join(v, "privkey.pem")
		cert, err := tls.LoadX509KeyPair(certFile, keyFile)
		if err != nil {
			log.Fatal(err)
		}
		tlsConf.Certificates = append(tlsConf.Certificates, cert)
	}

	tlsConf.BuildNameToCertificate()

	//http.Handle("/", http.FileServer(http.Dir("./static")))
	//http.HandleFunc("/submit", sendHandle)
	//StartDaifugoServer()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
		log.Printf("Defaulting to port %s", port)
	}

	go func() {
		log.Printf("Listening on port %s", port)
		if err := http.ListenAndServe(":"+port, IHandler{}); err != nil {
			log.Fatal(err)
		}
	}()

	sserv := http.Server{
		Addr:      ":8181",
		Handler:   SHandler{},
		TLSConfig: tlsConf,
	}

	if err := sserv.ListenAndServeTLS("", ""); err != nil {
		log.Fatal(err)
	}

}
