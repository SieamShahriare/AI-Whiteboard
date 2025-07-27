import React, { useEffect, useRef, useState } from "react";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { SWATCHES } from "./constants";

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

interface Line {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

interface Action {
  lines: Line[];
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [drawingActions, setDrawingActions] = useState<Action[]>([]);
  const [actionIndex, setActionIndex] = useState(-1);
  const [answers, setAnswers] = useState<
    { x: number; y: number; text: string }[]
  >([]);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set the canvas width/height attributes to match the displayed size
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.lineCap = "round";
          ctx.lineWidth = 8; // Set brush thickness here
        }
        redrawCanvas();
      };
      resize();
      window.addEventListener("resize", resize);

      // Set up keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
          e.preventDefault();
          undo();
        } else if (e.key === "Enter") {
          e.preventDefault();
          runRoute();
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
    // eslint-disable-next-line
  }, [actionIndex, drawingActions, dictOfVars, answers]);

  // Redraw canvas when actions or answers change
  useEffect(() => {
    redrawCanvas();
    // eslint-disable-next-line
  }, [drawingActions, actionIndex, answers]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all drawing actions
    for (let i = 0; i <= actionIndex; i++) {
      const action = drawingActions[i];
      if (action) {
        action.lines.forEach((line: Line) => {
          ctx.strokeStyle = line.color;
          ctx.beginPath();
          ctx.moveTo(line.startX, line.startY);
          ctx.lineTo(line.endX, line.endY);
          ctx.stroke();
        });
      }
    }

    // Redraw all answers (persistent)
    answers.forEach((answer) => {
      ctx.font =
        'bold 40px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = "#3b82f6";
      ctx.fillText(answer.text, answer.x, answer.y);
    });
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setAnswers([]);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.background = "white";
    }
    setIsDrawing(true);
    setLastPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    setDrawingActions((prev) => prev.slice(0, actionIndex + 1));
    setActionIndex((prev) => prev + 1);
    setDrawingActions((prev) => [...prev, { lines: [] }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos) return;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    const newLine: Line = {
      startX: lastPos.x,
      startY: lastPos.y,
      endX: x,
      endY: y,
      color,
    };

    setDrawingActions((prev) => {
      const updated = [...prev];
      if (updated[actionIndex]) {
        updated[actionIndex] = {
          lines: [...updated[actionIndex].lines, newLine],
        };
      }
      return updated;
    });
    setLastPos({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const undo = () => {
    if (actionIndex >= 0) {
      setActionIndex((prev) => prev - 1);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setDrawingActions([]);
    setActionIndex(-1);
    setDictOfVars({});
    setAnswers([]);
    setReset(false);
  };

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setDrawingActions([]);
      setActionIndex(-1);
      setDictOfVars({});
      setAnswers([]);
      setReset(false);
    }
  }, [reset]);

  const runRoute = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsLoading(true);

    try {
      const response = await axios({
        method: "post",
        url: "http://localhost:8900/calculate",
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        },
      });

      const res = await response.data;
      console.log("Response", res);

      const newVars: Record<string, string> = {};
      res.data.forEach((data: Response) => {
        if (data.assign) {
          newVars[data.expr] = data.result;
        }
      });
      setDictOfVars((prev) => ({ ...prev, ...newVars }));

      if (drawingActions.length > 0 && actionIndex >= 0) {
        const lastAction = drawingActions[actionIndex];
        if (lastAction && lastAction.lines.length > 0) {
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

          lastAction.lines.forEach((line) => {
            minX = Math.min(minX, line.startX, line.endX);
            minY = Math.min(minY, line.startY, line.endY);
            maxX = Math.max(maxX, line.startX, line.endX);
            maxY = Math.max(maxY, line.startY, line.endY);
          });

          const answerX = maxX + 50;
          const answerY = (minY + maxY) / 2;

          setAnswers((prev) => [
            ...prev,
            ...res.data.map((data: Response) => ({
              x: answerX,
              y: answerY,
              text: data.result,
              equationId: actionIndex,
            })),
          ]);
        }
      }
    } catch (error) {
      console.error("Error calculating:", error);
    }finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
        {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-700 font-medium">Calculating...</p>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={clear}
              className="bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 shadow-sm"
              disabled={isLoading}
              variant="outline"
            >
              <span className="font-medium">Clear Canvas</span>
            </Button>
            <Button
              onClick={undo}
              className="bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 shadow-sm"
              variant="outline"
              disabled={isLoading}
            >
              <span className="font-medium">Undo</span>
              <span className="ml-2 text-xs text-gray-500">(Ctrl+Z)</span>
            </Button>
          </div>

          <Group>
            {SWATCHES.map((swatch) => (
              <ColorSwatch
                key={swatch}
                color={swatch}
                onClick={() => setColor(swatch)}
                className="cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-gray-400 transition-all"
                size={28}
              />
            ))}
          </Group>

          <Button
            onClick={runRoute}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            disabled={isLoading}
            >
                <span className="font-medium">
                    {isLoading ? "Calculating..." : "Calculate"}
                </span>
                <span className="ml-2 text-xs text-blue-100">(Enter)</span>
            </Button>   
        </div>

        <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <canvas
            ref={canvasRef}
            id="canvas"
            className="w-full h-[calc(100vh-180px)]"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
}
