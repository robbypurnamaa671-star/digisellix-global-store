import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

const FloatingWhatsApp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const whatsappNumber = "6283822199640"; // Admin WhatsApp number

  const handleSendMessage = () => {
    const encodedMessage = encodeURIComponent(
      message || "Hello! I need assistance with Digisellix."
    );
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
    setIsOpen(false);
    setMessage("");
  };

  return (
    <>
      {/* Floating WhatsApp Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center group"
          aria-label="Contact us on WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute right-full mr-3 bg-background text-foreground px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-sm font-medium">
            Need help? Chat with us!
          </span>
        </button>
      )}

      {/* WhatsApp Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-[#25D366] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-[#25D366]" />
              </div>
              <div>
                <h3 className="font-bold">Digisellix Support</h3>
                <p className="text-xs opacity-90">Online - Ready to help!</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 bg-muted/30 space-y-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-sm text-muted-foreground mb-2">
                👋 Hello! How can we help you today?
              </p>
              <p className="text-xs text-muted-foreground">
                Typical reply time: Under 5 minutes
              </p>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] text-sm"
              maxLength={500}
            />

            <button
              onClick={handleSendMessage}
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              Start Chat on WhatsApp
            </button>
          </div>

          {/* Footer */}
          <div className="bg-muted/50 px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">
              We typically reply within minutes
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingWhatsApp;
