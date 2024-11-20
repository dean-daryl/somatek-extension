import React, { useEffect, useState } from "react";
import Groq from "groq-sdk";
import { Header } from "./components/Header";
import { TimestampModal } from "./components/TimestampModal";
import { Card, CardContent } from "../src/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "../src/lib/util";

const App: React.FC = () => {
  const [text, setResult] = useState("");
  const [simplifiedText, setResultSimple] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const GROK_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

  const groq = new Groq({
    apiKey: GROK_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  useEffect(() => {
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
            console.error("Script injection failed:", chrome.runtime.lastError.message);
            return;
          }

          if (injectionResults && injectionResults.length > 0) {
            const pageTitle = injectionResults[0].result as string;
            setResult(pageTitle);
          }
        }
      );
    });

    async function getGroqChatCompletion() {
      setIsLoading(true);
      try {
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
        await fetch(`http://localhost:8080/technology?text=${encodeURIComponent(text)}`, {
          method: 'POST',
        });
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
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
              return { src: videoElement.src, duration: videoElement.duration };
            }
            return null;
          },
        },
        (injectionResults) => {
          if (chrome.runtime.lastError) {
            console.error("Script injection failed:", chrome.runtime.lastError.message);
            return;
          }

          if (injectionResults && injectionResults.length > 0) {
            const videoData = injectionResults[0].result;
            if (videoData && text.length < 1) {
              setVideoDuration(videoData.duration);
              setShowModal(true);
            }
          }
        }
      );
    });

    if (text.trim().length > 3) getGroqChatCompletion();
  }, [text]);

  const handleConfirmTimestamps = (start: number, end: number) => {
    transcribeSelectedRange(start, end);
  };

  async function transcribeSelectedRange(startTime: number, endTime: number) {
    try {
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
          () => {
            if (chrome.runtime.lastError) {
              console.error("Script injection failed:", chrome.runtime.lastError.message);
            } else {
              captureTabAudio(startTime, endTime);
            }
          }
        );
      });
    } catch (error) {
      console.error("Error accessing display media:", error);
    }
  }

  function captureTabAudio(startTime: number, endTime: number) {
    setIsLoading(true);
    chrome.tabCapture.capture({ audio: true }, (stream) => {
      if (chrome.runtime.lastError || !stream) {
        console.error("Failed to capture tab:", chrome.runtime.lastError);
        setIsLoading(false);
        return;
      }

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();

      source.connect(destination);
      source.connect(audioContext.destination);

      const mediaRecorder = new MediaRecorder(destination.stream);
      const audioChunks: BlobPart[] = [];

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

  async function transcribeAudio(audioBlob: Blob) {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append("model", "whisper-large-v3");
      formData.append("prompt", "Specify context or spelling");
      formData.append("temperature", "0");
      formData.append("response_format", "json");

      const response = await fetch("https://api.groq.com/openai/v1/audio/translations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROK_API_KEY}`,
        },
        body: formData,
      });

      const transcriptionResult = await response.json();
      if (transcriptionResult.text) {
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
    } catch (error) {
      console.error("Error transcribing audio:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-[500px] h-fit bg-background text-foreground">
      <Header />
      
      <main className="p-4 space-y-4">
        <Card className={cn(
          "transition-all duration-300",
          isLoading ? "opacity-50" : "opacity-100"
        )}>
          <CardContent className="pt-6">
            {simplifiedText ? (
              <p className="text-[15px] leading-relaxed">{simplifiedText}</p>
            ) : (
              <div className="flex items-center justify-center py-8">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Processing...</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select text or a video segment to simplify
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {showModal && (
        <TimestampModal
          onConfirm={handleConfirmTimestamps}
          onClose={() => setShowModal(false)}
          videoDuration={videoDuration ?? 0}
        />
      )}
    </div>
  );
};

export default App;