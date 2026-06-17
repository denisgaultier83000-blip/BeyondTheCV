import os
import json
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import psycopg2
from dotenv import load_dotenv

# Charge les mêmes variables d'environnement que l'API
load_dotenv()

def send_interview_reminder(to_email, first_name, target_company, enjeux):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not all([smtp_host, smtp_user, smtp_pass]):
        print(f"[CRON] ⚠️ Configuration SMTP manquante pour {to_email}.")
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = f"Coach BeyondTheCV <{smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = f"D-1 : Vos 5 enjeux stratégiques pour l'entretien {target_company}"

    # --- Formatage des enjeux en HTML propre ---
    enjeux_html = ""
    for i, enjeu in enumerate(enjeux[:5], 1):
        title = enjeu.get("title", "Enjeu Stratégique")
        analysis = enjeu.get("strategic_analysis", "").replace('\n', '<br>')
        source = enjeu.get("source", "Presse")
        url = enjeu.get("url", "#")
        
        enjeux_html += f"""
        <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #0F2650; background-color: #f8fafc; border-radius: 0 8px 8px 0;">
            <h3 style="margin-top: 0; color: #0F2650; font-size: 16px;">{i}. {title}</h3>
            <p style="font-size: 14px; color: #334155; line-height: 1.5;">{analysis}</p>
            <a href="{url}" style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: bold;">→ Source : {source}</a>
        </div>
        """

    html_body = f"""
    <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0F2650; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">L'heure de vérité approche.</h2>
        <p>Bonjour {first_name},</p>
        <p>Votre entretien chez <strong>{target_company}</strong> a lieu demain.</p>
        <p>Ne relisez pas votre CV ce soir, le recruteur l'a déjà fait. Concentrez-vous sur ce qui a une vraie valeur : <strong>les enjeux qui l'empêchent de dormir la nuit</strong>.</p>
        <p>Voici un rappel rapide de vos signaux stratégiques à glisser intelligemment dans la conversation :</p>
        
        {enjeux_html}
        
        <div style="margin-top: 30px; padding: 20px; background-color: #0F2650; color: white; text-align: center; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0;">Dernier conseil de votre Coach</h3>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Posez des questions, prenez des notes, et asseyez votre leadership. Vous êtes là pour résoudre un problème, pas pour demander un emploi.</p>
        </div>
    </div>
    """

    msg.attach(MIMEText("Veuillez activer le format HTML pour lire cet email.", "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            print(f"[CRON] ✅ Email stratégique (J-1) envoyé à {to_email}")
    except Exception as e:
        print(f"[CRON] ❌ Erreur d'envoi à {to_email}: {e}")

def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[CRON] ❌ DATABASE_URL introuvable.")
        return

    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        cursor.execute("SELECT u.email, u.first_name, p.profile_data FROM users u JOIN user_profiles p ON u.id = p.user_id")
        users = cursor.fetchall()
        
        tomorrow = (datetime.now() + timedelta(days=1)).date()
        sent_count = 0
        
        for email, first_name, profile_data_str in users:
            if not profile_data_str: continue
            try:
                data = json.loads(profile_data_str)
                date_str = data.get("form", {}).get("interview_date", "")
                if date_str:
                    if datetime.strptime(date_str, "%Y-%m-%d").date() == tomorrow:
                        company = data.get("form", {}).get("target_company", "votre cible")
                        enjeux = data.get("market_research", {}).get("company_report", {}).get("news_links", [])
                        if enjeux:
                            send_interview_reminder(email, first_name or "Candidat", company, enjeux)
                            sent_count += 1
            except Exception: pass # Ignore les formats de date non standards (ex: "Dans 3 jours")
            
        print(f"[CRON] 🎉 Job terminé. {sent_count} rappel(s) envoyé(s).")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    main()