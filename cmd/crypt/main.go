package main

import (
	"encoding/hex"
	"flag"
	"fmt"
	"os"

	"github.com/swardle/swardle_web/crypt"
)

func main() {
	defaultStrKey := "testtesttest"

	if val, found := os.LookupEnv("SWARDLE_APP_DATA_KEY"); found {
		hexbytes, err := hex.DecodeString(val)
		if err != nil {
			panic(err)
		}
		defaultStrKey = string(hexbytes)
	}

	key := []byte(*flag.String("key", defaultStrKey, "a 32 bytes key (AES-256)"))
	mode := flag.String("mode", "encrypt", "encrypt or decrypt")
	plainTextFileName := flag.String("plainTextFileName", "data.json", "input file name")
	encryptedFileName := flag.String("encryptedFileName", "data.ase", "output file name")
	writeFile := flag.Bool("writeFile", false, "output file name")
	flag.Parse()

	switch *mode {
	case "encrypt":
		fmt.Printf("%s reading\n", *plainTextFileName)
		plaintext, err := crypt.ReadFromFile(*plainTextFileName)
		if err != nil {
			fmt.Printf("%s File is not found\n", *plainTextFileName)
		} else {
			ciphertext := crypt.Encrypt(plaintext, key)
			fmt.Printf("%s Writing\n", *encryptedFileName)
			crypt.WriteToFile(ciphertext, *encryptedFileName)
		}
	case "decrypt":
		fmt.Printf("%s reading\n", *encryptedFileName)
		if ciphertext, err := crypt.ReadFromFile(*encryptedFileName); err != nil {
			fmt.Printf("%s File is not found\n", *encryptedFileName)
		} else {
			plaintext := crypt.Decrypt(ciphertext, key)
			fmt.Println(string(plaintext))
			if *writeFile {
				fmt.Printf("%s Writing\n", *plainTextFileName)
				crypt.WriteToFile(plaintext, *plainTextFileName)
			}
		}
	}
}
