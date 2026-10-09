const thankYouMailTemplate = `
<div>
  <p>Hi {{lead_name}},</p>

  <p>Thanks for getting in touch with us through our chatbot.</p>

  <p>We’ve received your message and will follow up if your chat session requires a response.</p>

  <p>
    In the meantime, you can check out our website and FAQs: 
    <a href="https://ultimabot.ai/" style="color:#2980b9; text-decoration:none;">
      https://ultimabot.ai/
    </a>
  </p>

  <p>Just hit reply if you’d like to add anything to your chat conversation.</p>

  <p>
    Cheers,<br>
    The UltimaBot Team
  </p>

  <p>
    <a href="https://ultimabot.ai/" style="color:#2980b9; text-decoration:none;">
      https://ultimabot.ai/
    </a>
  </p>

  <p>
    <img src="https://app.ultimabot.ai/icons/logoblu.svg"
         alt="UltimaBot Logo"
         style="width:150px; height:auto;" />
  </p>
</div>
`;

export default thankYouMailTemplate;
