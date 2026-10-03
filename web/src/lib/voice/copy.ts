import type { Language } from "../i18n";

// Interface guidance only; never used to translate medicine instructions.
export const automaticVoiceCopy: Record<Language, { explanation: string; tapToRead: string }> = {
  en: {
    explanation: "Medicine information reads automatically when this page opens. After each reading, MEDOT listens for a command for up to 10 seconds. Your browser may ask for microphone permission and may process speech online. MEDOT does not store recordings. Stop cancels reading and listening. If automatic audio is blocked, tap Read medicine aloud once.",
    tapToRead: "Automatic audio could not start. Tap Read medicine aloud to try again. Check your phone’s media volume and text-to-speech settings if you still cannot hear it.",
  },
  bn: {
    explanation: "এই পৃষ্ঠা খুললে ওষুধের তথ্য স্বয়ংক্রিয়ভাবে পড়া হয়। প্রতিবার পড়া শেষ হলে MEDOT সর্বোচ্চ ১০ সেকেন্ড নির্দেশ শোনে। ব্রাউজার মাইক্রোফোনের অনুমতি চাইতে পারে এবং অনলাইনে কথা প্রক্রিয়া করতে পারে। MEDOT রেকর্ডিং সংরক্ষণ করে না। থামান চাপলে পড়া ও শোনা বন্ধ হয়। স্বয়ংক্রিয় অডিও আটকে গেলে ওষুধের তথ্য শুনুন বোতামটি একবার চাপুন।",
    tapToRead: "স্বয়ংক্রিয় অডিও শুরু করা যায়নি। আবার চেষ্টা করতে ওষুধের তথ্য শুনুন চাপুন। তবুও শুনতে না পেলে ফোনের মিডিয়া ভলিউম ও টেক্সট-টু-স্পিচ সেটিংস দেখুন।",
  },
  hi: {
    explanation: "यह पृष्ठ खुलने पर दवा की जानकारी अपने आप पढ़ी जाती है। हर बार पढ़ना समाप्त होने पर MEDOT अधिकतम 10 सेकंड तक आदेश सुनता है। ब्राउज़र माइक्रोफ़ोन की अनुमति माँग सकता है और आवाज़ को ऑनलाइन संसाधित कर सकता है। MEDOT रिकॉर्डिंग सहेजता नहीं है। रोकें दबाने से पढ़ना और सुनना बंद होता है। अपने आप ऑडियो न चले तो दवा की जानकारी सुनें एक बार दबाएँ।",
    tapToRead: "ऑडियो अपने आप शुरू नहीं हो सका। फिर से कोशिश करने के लिए दवा की जानकारी सुनें दबाएँ। फिर भी आवाज़ न आए तो फ़ोन का मीडिया वॉल्यूम और टेक्स्ट-टू-स्पीच सेटिंग देखें।",
  },
};
