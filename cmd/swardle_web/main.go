package main

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"runtime"
	"sync"
	"time"

	secretmanager "cloud.google.com/go/secretmanager/apiv1"
	"github.com/google/uuid"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	"github.com/swardle/swardle_web/crypt"
	"golang.org/x/crypto/acme/autocert"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	secretmanagerpb "google.golang.org/genproto/googleapis/cloud/secretmanager/v1"
)

type sessionRow struct {
	SID    uuid.UUID
	UserID string
	Cookie *http.Cookie
}

type userRow struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

var (
	googleOauthConfig = &oauth2.Config{
		RedirectURL:  "http://localhost:8080/callback", // "template/dlobby.html",
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}
	randomState   = "random"
	gAppLock      sync.RWMutex
	gSessionTable = map[string]sessionRow{}
	gUserTable    = map[string]userRow{}
)

// Create a session and cookies
func CreateSession() (sessionRow, error) {
	id := uuid.New()
	idEncoded := base64.StdEncoding.EncodeToString([]byte(id.String()))
	fmt.Printf("str = %s encoded = %s\n", id.String(), idEncoded)
	cookie := &http.Cookie{
		Name:     "session",
		Value:    idEncoded,
		HttpOnly: true,
		Secure:   true,
		Path:     "/",
	}

	var session = sessionRow{
		SID:    id,
		UserID: "",
		Cookie: cookie,
	}
	fmt.Printf("Session id %v\n", session)

	gAppLock.Lock()
	defer gAppLock.Unlock()
	gSessionTable[id.String()] = session
	return session, nil
}

func AddUser(sid string, user userRow) error {
	fmt.Printf("User %v\n", user)

	gAppLock.Lock()
	defer gAppLock.Unlock()
	session, found := gSessionTable[sid]
	if !found {
		return fmt.Errorf("can't find session")
	}
	session.UserID = user.ID
	fmt.Printf("User added to session %v\n", session)

	return nil
}

func handleLogin(rw http.ResponseWriter, req *http.Request) {
	fmt.Printf("Req: %s %s\n", req.Host, req.URL.Path)
	if req.Host != "localhost:8080" {
		googleOauthConfig.RedirectURL = "https://swardle.com/callback"
	}
	var session = sessionRow{}
	cookie, err := req.Cookie("session")

	// if we get a good cookie get the session id from it.
	// sessionID base64 Encoded
	if err == nil {
		cookieValue, err := base64.StdEncoding.DecodeString(cookie.Value)
		cookieValueStr := string(cookieValue)
		if err != nil {
			fmt.Println("cookieValue is not valid")
			http.Redirect(rw, req, "/", http.StatusTemporaryRedirect)
		}
		fmt.Printf("%s=%s\r\n", cookie.Name, cookieValueStr)
		sid := cookieValueStr

		gAppLock.RLock()
		var found bool
		session, found = gSessionTable[sid]
		gAppLock.RUnlock()
		if !found {
			session, _ = CreateSession()
			http.SetCookie(rw, session.Cookie)
		}
	} else {
		session, _ = CreateSession()
		http.SetCookie(rw, session.Cookie)
	}

	fmt.Printf("rederect to callback using session id %v\n", session.SID)
	url := googleOauthConfig.AuthCodeURL(session.SID.String())
	fmt.Printf("rederect to callback using url %v\n", url)
	http.Redirect(rw, req, url, http.StatusTemporaryRedirect)
}

func handleCallback(rw http.ResponseWriter, req *http.Request) {
	sid := req.FormValue("state")
	fmt.Printf("State SessionID sid\n%v\n", sid)
	gAppLock.RLock()
	session, found := gSessionTable[sid]
	gAppLock.RUnlock()

	if !found {
		fmt.Println("State SessionID is not valid")
		http.Redirect(rw, req, "/", http.StatusTemporaryRedirect)
		return
	}

	cookie, err := req.Cookie("session")
	if err != nil {
		fmt.Println("cookie is not valid")
		http.Redirect(rw, req, "/", http.StatusTemporaryRedirect)
	}

	cookieValue, err := base64.StdEncoding.DecodeString(cookie.Value)
	cookieValueStr := string(cookieValue)
	if err != nil {
		fmt.Println("cookieValue is not valid")
		http.Redirect(rw, req, "/", http.StatusTemporaryRedirect)
	}
	fmt.Printf("%s=%s\r\n", cookie.Name, cookieValueStr)
	cookieSID := cookieValueStr
	fmt.Printf("Cookie SessionID\n%v\n", cookieSID)
	fmt.Printf("State SessionID sid\n%v\n", sid)

	if cookieSID != sid {
		fmt.Println("Cookie SessionID is not valid")
		http.Redirect(rw, req, "/", http.StatusTemporaryRedirect)
		return
	}

	token, err := googleOauthConfig.Exchange(oauth2.NoContext, req.FormValue("code"))
	if err != nil {
		fmt.Printf("could not get token: %s\n", err.Error())
		http.Redirect(rw, req, "/", http.StatusTemporaryRedirect)
		return
	}

	url := fmt.Sprintf("https://www.googleapis.com/oauth2/v2/userinfo?access_token=%s", token.AccessToken)
	resp, err := http.Get(url)
	if err != nil {
		fmt.Printf("could not create get request: %s\n", err.Error())
		http.Redirect(rw, req, "/", http.StatusTemporaryRedirect)
		return
	}

	defer resp.Body.Close()
	content, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("could not parse response: %s\n", err.Error())
		http.Redirect(rw, req, "/", http.StatusTemporaryRedirect)
		return
	}

	fmt.Printf("Response: %s", content)
	fmt.Fprintf(rw, "Response: %s", content)

	var user userRow
	err = json.Unmarshal([]byte(content), &user)

	if err != nil {
		fmt.Printf("could not parse user data: %s\n", err.Error())
		http.Redirect(rw, req, "/", http.StatusTemporaryRedirect)
		return
	}

	AddUser(session.SID.String(), user)
}

func addSecretsToEnv(ctx context.Context, client *secretmanager.Client, secretName string, envName string) error {
	// Build the request.
	req := &secretmanagerpb.AccessSecretVersionRequest{
		Name: fmt.Sprintf("projects/694671698910/secrets/%s/versions/latest", secretName),
	}

	// Call the API.
	result, err := client.AccessSecretVersion(ctx, req)
	if err != nil {
		fmt.Printf("failed to access secret version: %v %s %s", err, secretName, envName)
		return fmt.Errorf("failed to access secret version: %v %s %s", err, secretName, envName)
	}

	os.Setenv(envName, string(result.Payload.Data))
	return nil
}

// GoogleRecaptchaResponse ...
type GoogleRecaptchaResponse struct {
	Success            bool     `json:"success"`
	ChallengeTimestamp string   `json:"challenge_ts"`
	Hostname           string   `json:"hostname"`
	ErrorCodes         []string `json:"error-codes"`
}

// This will handle the reCAPTCHA verification between your server to Google's server
func validateReCAPTCHA(recaptchaResponse string) (bool, error) {

	// Check this URL verification details from Google
	// https://developers.google.com/recaptcha/docs/verify
	req, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify", url.Values{
		"secret":   {os.Getenv("RECAPTCHA_API_KEY")},
		"response": {recaptchaResponse},
	})
	if err != nil { // Handle error from HTTP POST to Google reCAPTCHA verify server
		return false, err
	}
	defer req.Body.Close()
	body, err := ioutil.ReadAll(req.Body) // Read the response from Google
	if err != nil {
		return false, err
	}

	var googleResponse GoogleRecaptchaResponse
	err = json.Unmarshal(body, &googleResponse) // Parse the JSON response from Google
	if err != nil {
		return false, err
	}
	return googleResponse.Success, nil
}

type contactForm struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Subject   string `json:"subject"`
	Message   string `json:"message"`
	ReCaptcha string `json:"g-recaptcha-response"`
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
	c.ReCaptcha = req.FormValue("g-recaptcha-response")

	result, err := validateReCAPTCHA(c.ReCaptcha)
	if err != nil || !result {
		errstr := fmt.Sprintf("error = %v result = %v", err, result)
		http.Error(rw, "please hit I am not robot button\n or = "+errstr, 500)
		return
	}

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

	from := mail.NewEmail("FormMailer", "swardle@swardle.com")
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

func AddSecretToEnv() {
	// Create the client.
	// this will fail on windows
	// so manually add these envioment
	// vars to your envioment
	ctx := context.Background()
	client, err := secretmanager.NewClient(ctx)
	if err != nil {
		log.Println(fmt.Sprintf("failed to create secretmanager client: %v", err))
		return
	}
	log.Println(fmt.Sprintf("Adding secrets"))

	// using "GOOGLE_APPLICATION_CREDENTIALS" on windows
	apikey := os.Getenv("SENDGRID_API_KEY")
	if apikey == "" {
		addSecretsToEnv(ctx, client, "SENDGRID_API_KEY", "SENDGRID_API_KEY")
	}

	apikey = os.Getenv("RECAPTCHA_API_KEY")
	if apikey == "" {
		addSecretsToEnv(ctx, client, "reCAPTCHA", "RECAPTCHA_API_KEY")
	}

	apikey = os.Getenv("SWARDLE_APP_DATA_KEY")
	if apikey == "" {
		addSecretsToEnv(ctx, client, "SWARDLE_APP_DATA_KEY", "SWARDLE_APP_DATA_KEY")
	}

	if googleOauthConfig.ClientID == "" {
		addSecretsToEnv(ctx, client, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID")
		googleOauthConfig.ClientID = os.Getenv("GOOGLE_CLIENT_ID")
	}
	if googleOauthConfig.ClientSecret == "" {
		addSecretsToEnv(ctx, client, "GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET")
		googleOauthConfig.ClientSecret = os.Getenv("GOOGLE_CLIENT_SECRET")
	}
}

type UserData struct {
	Admin       []string `json:"admin"`
	CreateGames []string `json:"createGames"`
}

func LoadAdminAndUserData() UserData {
	app_key_hex := os.Getenv("SWARDLE_APP_DATA_KEY")
	app_key, err := hex.DecodeString(app_key_hex)
	ciphertext, err := crypt.ReadFromFile("data.ase")
	if err != nil {
		log.Fatal(err)
	}

	plaintext := crypt.Decrypt(ciphertext, app_key)

	var userData UserData
	json.Unmarshal(plaintext, &userData)
	return userData
}

func main() {

	isWin := false
	if runtime.GOOS == "windows" {
		isWin = true
	}

	// Disable log prefixes such as the default timestamp.
	// Prefix text prevents the message from being parsed as JSON.
	// A timestamp is added when shipping logs to Cloud Logging.
	log.SetFlags(0)
	AddSecretToEnv()

	port := os.Getenv("PORT")
	if port == "" {
		if isWin {
			port = "8080"
		} else {
			port = "80"
		}
		log.Printf("Defaulting to port %s", port)
	}

	http.Handle("/", http.FileServer(http.Dir("./static")))
	http.HandleFunc("/submit", sendHandle)
	http.HandleFunc("/login", handleLogin)
	http.HandleFunc("/callback", handleCallback)
	StartDaifugoServer()

	if isWin {
		log.Printf("Listening on port with http %s", port)
		if err := http.ListenAndServe(":"+port, nil); err != nil {
			log.Fatal(err)
		}
	} else {
		certManager := autocert.Manager{
			Prompt:     autocert.AcceptTOS,
			HostPolicy: autocert.HostWhitelist("swardle.com", "www.swardle.com"), //Your domain here
			Cache:      autocert.DirCache("certs"),                               //Folder for storing certificates
		}
		server := &http.Server{
			Addr: ":https",
			TLSConfig: &tls.Config{
				GetCertificate: certManager.GetCertificate,
			},
		}

		go func() {
			log.Printf("Listening on port %s http and 443 for https", port)
			if err := http.ListenAndServe(":"+port, certManager.HTTPHandler(nil)); err != nil {
				log.Fatal(err)
			}
		}()

		log.Fatal(server.ListenAndServeTLS("", "")) //Key and cert are coming from Let's Encrypt
	}

}
