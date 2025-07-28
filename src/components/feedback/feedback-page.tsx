'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Loader2, Tags } from 'lucide-react';
import { Separator } from '../ui/separator';

interface AnalysisResult {
  topics: string[];
  suggestions: string[];
}

export default function FeedbackPage() {
  const [feedbackText, setFeedbackText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!feedbackText.trim()) {
      toast({
        title: 'Input required',
        description: 'Please enter some feedback text to analyze.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    // In a real app, you would call the Genkit AI flow here.
    // const response = await analyzeFeedbackFlow(feedbackText);
    // For now, we simulate the API call and response.
    console.log('Analyzing feedback:', feedbackText);

    setTimeout(() => {
      const mockResult: AnalysisResult = {
        topics: ['Registration Process', 'User Interface', 'Event Content'],
        suggestions: [
          'Simplify the member addition form by reducing the number of required fields.',
          'Add a dark mode option to the dashboard for better viewing in low-light conditions.',
          'Provide a confirmation email after a member successfully pre-registers for an event.',
        ],
      };
      setResult(mockResult);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold font-headline">Feedback Analysis</h1>
        <p className="text-muted-foreground">
          Analyze event feedback to identify key topics and get UI/UX improvement suggestions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feedback Input</CardTitle>
          <CardDescription>
            Paste or type the event feedback you want to analyze below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full gap-1.5">
            <Label htmlFor="feedback-text">Feedback Text</Label>
            <Textarea
              id="feedback-text"
              placeholder="e.g., 'The check-in process was slow and the app was hard to navigate...'"
              rows={8}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAnalyze} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Feedback'
            )}
          </Button>
        </CardFooter>
      </Card>

      {result && (
        <Card>
            <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>Based on the feedback provided.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold flex items-center mb-2"><Tags className="mr-2 h-5 w-5 text-primary" /> Topics Identified</h3>
                    <div className="flex flex-wrap gap-2">
                        {result.topics.map((topic, index) => (
                            <Badge key={index} variant="secondary">{topic}</Badge>
                        ))}
                    </div>
                </div>
                <Separator />
                <div>
                    <h3 className="text-lg font-semibold flex items-center mb-2"><Lightbulb className="mr-2 h-5 w-5 text-accent" /> Improvement Suggestions</h3>
                    <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                        {result.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
