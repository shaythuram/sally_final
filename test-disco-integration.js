// Test script to verify DISCO integration
// Run this after starting your Node.js server on localhost:3000

const testDiscoAnalysis = async () => {
  const testConversation = `
You: Hi, thanks for taking the time today. Before we dive in, can I ask? How is Dell currently leveraging AI across its operations or services?

Speaker 1: Well, we're really focused on AI-driven customer service and automation. We've implemented chatbots and virtual assistants across our support channels.

You: That's interesting. What specific challenges are you facing with your current AI implementation?

Speaker 1: The main issues are around scalability and accuracy. We're seeing about 70% accuracy in our current system, but we need to get to 90%+ to really trust it for customer interactions.

You: I understand. What would achieving that 90% accuracy mean for your business?

Speaker 1: It would mean we could handle 3x more customer inquiries without increasing headcount, and our customer satisfaction scores would improve significantly. We're looking at a potential $2M annual savings.

You: And what's your timeline for this improvement?

Speaker 1: We need to see results within the next 6 months. Our current system is becoming a bottleneck as we scale.
  `;

  try {
    console.log('Testing DISCO analysis...');
    console.log('Conversation length:', testConversation.length, 'characters');
    
    const response = await fetch('http://localhost:8000/api/analyze-disco', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: testConversation.trim(),
        context: {
          type: 'test',
          currentDISCO: {}
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ DISCO Analysis Response:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      console.log('\n📊 Extracted DISCO Data:');
      Object.entries(result.data).forEach(([key, value]) => {
        console.log(`${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      });
    } else {
      console.log('❌ Analysis failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testDiscoAnalysis();
