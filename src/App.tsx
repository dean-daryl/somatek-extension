// @collapsed
import Groq from "groq-sdk";
import React, { useEffect, useState } from "react";
import {Header} from "./components/Header.tsx";
import { TimestampModal } from "./components/TimestampModal.tsx";

const App: React.FC = () => {
  const [text, setResult] = useState("")
  const [simplifiedText, setResultSimple] = useState("")
  const [dots, setDots] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null); // New state for video duration


  const GROK_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

  const groq = new Groq({
    apiKey: GROK_API_KEY,
    dangerouslyAllowBrowser: true,
  });
console.log(simplifiedText);

useEffect(() => {
  const interval = setInterval(() => {
    setDots((prevDots) => (prevDots.length < 3 ? prevDots + '.' : ''));
  }, 500); // Adjust speed as needed

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id as number;

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
          content: `Explain the meaning of "${text}" in simple terms. Translate it into basic English suitable for someone below B1 proficiency level. Only provide the answer without additional context or introductory phrases.`,
        },
      ],
      model: "llama3-70b-8192",
    });
    const response = results.choices[0].message.content as string;
    setResultSimple(response);
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id as number;

    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          const videos = window.document.getElementsByTagName("video");
          const videoElement = videos[0];
          const title = window.getSelection()?.toString();

          if (videoElement && (!title || title.length < 1)) {
            return { src: videoElement.src, duration: videoElement.duration }; // Retrieve video duration
          } else {
            console.error("No video element found");
            return null;
          }
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
          const videoData = injectionResults[0].result;
          if (videoData && text.length < 1) {
            setVideoDuration(videoData.duration); // Set the duration in state
            setShowModal(true);
          } else {
            console.error("No video source found");
          }
        } else {
          console.error("No result from injected script");
        }
      }
    );
  });

  if (text.trim().length > 3) getGroqChatCompletion();
  return () => clearInterval(interval);
}, [text]);

  const handleConfirmTimestamps = (start: number, end: number) => {
    transcribeSelectedRange(start, end);
  };

  async function transcribeSelectedRange(startTime: number, endTime: number) {
    try {
      // Step 1: Set up the video playback within the tab context
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id as number;
  
        chrome.scripting.executeScript(
          {
            target: { tabId },
            func: (startTime, endTime) => {
              const videoElement = document.getElementsByTagName("video")[0];
              if (videoElement) {
                videoElement.currentTime = startTime;
                videoElement.play();
                const checkTime = () => {
                  if (videoElement.currentTime >= endTime) {
                    videoElement.pause();
                    videoElement.removeEventListener("timeupdate", checkTime);
                  }
                };
                videoElement.addEventListener("timeupdate", checkTime);
              }
            },
            args: [startTime, endTime],
          },
          (_injectionResults) => {
            if (chrome.runtime.lastError) {
              console.error("Script injection failed:", chrome.runtime.lastError.message);
            } else {
              console.log("Video playback adjusted in tab.");
              // Proceed to capture audio after ensuring the video is playing
              captureTabAudio(startTime, endTime);
            }
          }
        );
      });
    } catch (error) {
      console.error("Error accessing display media:", error);
    }
  }
  
  // Function to capture tab audio
  function captureTabAudio(startTime: number, endTime:number) {
    chrome.tabCapture.capture({ audio: true }, (stream) => {
      if (chrome.runtime.lastError || !stream) {
        console.error("Failed to capture tab:", chrome.runtime.lastError);
        return;
      }
    
      // Set up Web Audio context and create a destination for playback
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();
    
      // Connect the source to both the destination (for recording) and the default output (for playback)
      source.connect(destination);
      source.connect(audioContext.destination);
    
      // Set up MediaRecorder with the destination stream (records audio while playing it locally)
      const mediaRecorder = new MediaRecorder(destination.stream);
      const audioChunks = [] as any[];
    
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
    
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
    
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), (endTime - startTime) * 1000);
    });
    
  }
  
  async function transcribeAudio(audioBlob : Blob) {
    try {
      console.log("Audio is here", audioBlob)
      // Set up FormData to mimic a file upload
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav"); 
      formData.append("model", "whisper-large-v3"); 
      formData.append("prompt", "Specify context or spelling"); 
      formData.append("temperature", "0");
      formData.append("response_format", "json"); 
  
      // Send the form data to the third-party transcription API
      const response = await fetch("https://api.groq.com/openai/v1/audio/translations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROK_API_KEY}`, 
        },
        body: formData,
      });
      
      const transcriptionResult = await response.json();
      if(transcriptionResult.text){
        const transcriptions = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: `Explain the meaning of "${transcriptionResult.text}" in simple terms. Translate it into basic English suitable for someone below B1 proficiency level. Only provide the answer without additional context or introductory phrases. Note that its video transcription where accents can often be misleading try to be creative in case of any ambiguity. Feel free to correct mistakes in the transcription. For example technology names or any other jargon. Eliminate any unnecessary words like Here's an explanation and stuff.`,
            },
          ],
          model: "llama3-70b-8192",
        });
        const response = transcriptions.choices[0].message.content as string;
        setResultSimple(response);
      }
      console.log(transcriptionResult.text); 
    } catch (error) {
      console.error("Error transcribing audio:", error);
    }
  }

  return (
    <div className="container mx-auto p-4 w-[500px] rounded-lg">
    <Header />

    <div className="p-2">
      {simplifiedText ? (
        <p className="text-[15px]">{simplifiedText}</p>
      ) : (
        <div className="flex justify-center w-full">
          <span className="text-[100px] invisible">...</span>
          {/* Visible dots for animation */}
          <span className="text-[100px]">{dots}</span>
      </div>
      )}
    </div>
    {showModal && (
      <TimestampModal
          onConfirm={handleConfirmTimestamps}
          onClose={() => setShowModal(false)}
          videoDuration={videoDuration ?? 0} // Pass the duration as a prop
        />      )}
  </div>
  
  );
};

export default App;
