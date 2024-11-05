// @collapsed
import Groq from "groq-sdk";
import React, { useEffect, useState } from "react";
import {Header} from "./components/Header.tsx";

const App: React.FC = () => {
  const [text, setResult] = useState("")
  const [simplifiedText, setResultSimple] = useState("")

  const GROK_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

  const groq = new Groq({
    apiKey: GROK_API_KEY,
    dangerouslyAllowBrowser: true,
  });
console.log(simplifiedText);

  useEffect(() => {

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id as number;

      console.log("beste", GROK_API_KEY);

      chrome.scripting.executeScript(
          {
            target: { tabId },
            func: () => {
              const title = window.getSelection()?.toString();
              return title;
            },
          },
          (injectionResults) => {
            if (chrome.runtime.lastError) {
              console.error(
                  "Script injection failed:",
                  chrome.runtime.lastError.message
              );
              return;
            }

            if (injectionResults && injectionResults.length > 0) {
              const pageTitle = injectionResults[0].result as string;
              setResult(pageTitle);
            } else {
              console.error("No result from injected script");
            }
          }
      );
    });

    async function getGroqChatCompletion() {
      const results = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `what is the meaning of this? ${text} Also Can you translate this text into simple english ( less than a B1 proficiency level). Don't add here's a translation at the beginning`,
          },
        ],
        model: "llama3-70b-8192",
      });
      const response = results.choices[0].message.content as string;
      //
      setResultSimple(response);
      // setShow(true);

    }
    if (text.trim().length > 3) getGroqChatCompletion();

  }, [text])

  return (
      <div className="container mx-auto p-4 w-[500px] rounded-lg">
        <Header />
        {
          <h1>Extension to summarise text</h1>
        }
      </div>
  );
};

export default App;
