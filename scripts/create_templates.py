import os

BASE_DIR = os.getcwd()
TEMPLATE_DIR = os.path.join(BASE_DIR, "backend", "templates")

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"✅ Created: {path}")

def main():
    print(f"🎨 Creating LaTeX Templates in: {TEMPLATE_DIR}")

    # 1. CV ATS (Classique, propre)
    create_file(os.path.join(TEMPLATE_DIR, "cv_ats.tex"), r"""
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[margin=2cm]{geometry}
\usepackage{enumitem}
\usepackage{hyperref}
\usepackage{titlesec}

\titleformat{\section}{\large\bfseries\uppercase}{}{0em}{}[\titlerule]
\titlespacing{\section}{0pt}{12pt}{8pt}

\begin{document}
\pagestyle{empty}

\begin{center}
    {\Huge \textbf{\VAR{first_name} \VAR{last_name}}}\\[5pt]
    \VAR{current_role} \\
    \VAR{email} | \VAR{phone} | \VAR{city}, \VAR{country} \\
    \href{\VAR{linkedin}}{LinkedIn}
\end{center}

\BLOCK{if bio}
\section*{Profil}
\VAR{bio}
\BLOCK{endif}

\section*{Expérience Professionnelle}
\BLOCK{for exp in experiences}
\noindent \textbf{\VAR{exp.role}} \hfill \VAR{exp.start_date} -- \VAR{exp.end_date} \\
\textit{\VAR{exp.company}}
\begin{itemize}[noitemsep,topsep=0pt]
    \item \VAR{exp.description}
\end{itemize}
\vspace{5pt}
\BLOCK{endfor}

\section*{Formation}
\BLOCK{for edu in educations}
\noindent \textbf{\VAR{edu.degree}} \hfill \VAR{edu.year} \\
\textit{\VAR{edu.school}}
\vspace{5pt}
\BLOCK{endfor}

\section*{Compétences}
\BLOCK{if skills.technical}
\textbf{Techniques:} \VAR{skills.technical} \\
\BLOCK{endif}
\BLOCK{if skills.languages}
\textbf{Langues:} \VAR{skills.languages}
\BLOCK{endif}

\end{document}
""")

    # 2. CV Humain V1 (Moderne Standard)
    create_file(os.path.join(TEMPLATE_DIR, "cv_human.tex"), r"""
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[margin=1.5cm]{geometry}
\usepackage{xcolor}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage{hyperref}

\definecolor{primary}{RGB}{15, 38, 80} % Bleu Foncé BTCV
\definecolor{accent}{RGB}{109, 190, 247} % Bleu Clair BTCV

\titleformat{\section}{\Large\bfseries\color{primary}}{}{0em}{}[\color{accent}\titlerule]

\begin{document}
\pagestyle{empty}

\begin{center}
    {\Huge \textbf{\color{primary}\VAR{first_name} \VAR{last_name}}}\\[5pt]
    {\Large \VAR{current_role}}\\[5pt]
    \small \VAR{email} $\cdot$ \VAR{phone} $\cdot$ \VAR{city}
\end{center}

\vspace{10pt}

\BLOCK{if bio}
\section*{À propos}
\VAR{bio}
\BLOCK{endif}

\section*{Expériences}
\BLOCK{for exp in experiences}
\noindent \textbf{\VAR{exp.role}} \hfill \textit{\VAR{exp.start_date} -- \VAR{exp.end_date}} \\
\textbf{\color{primary}\VAR{exp.company}}
\begin{itemize}[leftmargin=*]
    \item \VAR{exp.description}
\end{itemize}
\vspace{8pt}
\BLOCK{endfor}

\section*{Formation}
\BLOCK{for edu in educations}
\noindent \textbf{\VAR{edu.degree}} \hfill \VAR{edu.year} \\
\textit{\VAR{edu.school}}
\vspace{5pt}
\BLOCK{endfor}

\section*{Compétences}
\begin{tabular}{@{}ll}
\BLOCK{if skills.technical}
\textbf{Expertise:} & \VAR{skills.technical} \\
\BLOCK{endif}
\BLOCK{if skills.languages}
\textbf{Langues:} & \VAR{skills.languages} \\
\BLOCK{endif}
\end{tabular}

\end{document}
""")

    # 3. CV Humain V2 (Creative - Colonne gauche)
    create_file(os.path.join(TEMPLATE_DIR, "cv_human_creative.tex"), r"""
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[margin=1cm]{geometry}
\usepackage{xcolor}
\usepackage{multicol}
\usepackage{titlesec}

\definecolor{sidebar}{RGB}{240, 244, 248}
\definecolor{text}{RGB}{15, 38, 80}

\begin{document}
\pagestyle{empty}

\begin{minipage}[t]{0.30\textwidth}
    \vspace{0pt}
    \colorbox{sidebar}{\begin{minipage}[t][\textheight]{0.95\textwidth}
        \vspace{10pt}
        \centering
        {\Large \textbf{\VAR{first_name}}}\\[2pt]
        {\Large \textbf{\VAR{last_name}}}\\[10pt]
        
        \raggedright
        \section*{Contact}
        \VAR{email}\\
        \VAR{phone}\\
        \VAR{city}\\
        
        \section*{Compétences}
        \VAR{skills.technical}
        
        \section*{Langues}
        \VAR{skills.languages}
        
        \section*{Qualités}
        \BLOCK{for q in qualities}
        - \VAR{q} \\
        \BLOCK{endfor}
    \end{minipage}}
\end{minipage}
\hfill
\begin{minipage}[t]{0.65\textwidth}
    \vspace{0pt}
    {\Huge \textbf{\color{text}\VAR{current_role}}}\\[10pt]
    
    \BLOCK{if bio}
    \textbf{Profil} \\
    \VAR{bio} \\[15pt]
    \BLOCK{endif}
    
    \section*{Expérience}
    \BLOCK{for exp in experiences}
    \textbf{\VAR{exp.role}} | \VAR{exp.company} \\
    \textit{\VAR{exp.start_date} -- \VAR{exp.end_date}}
    \begin{itemize}
        \item \VAR{exp.description}
    \end{itemize}
    \vspace{5pt}
    \BLOCK{endfor}
    
    \section*{Formation}
    \BLOCK{for edu in educations}
    \textbf{\VAR{edu.degree}} \\
    \VAR{edu.school}, \VAR{edu.year}
    \vspace{5pt}
    \BLOCK{endfor}
\end{minipage}

\end{document}
""")

    # 4. CV Humain V3 (Minimalist)
    # Pour l'instant, on copie le V1 en changeant juste la police ou la couleur si besoin
    # Ici on fait un alias simple pour éviter l'erreur 500
    with open(os.path.join(TEMPLATE_DIR, "cv_human.tex"), "r", encoding="utf-8") as f:
        content = f.read()
    create_file(os.path.join(TEMPLATE_DIR, "cv_human_minimal.tex"), content.replace("15, 38, 80", "0, 0, 0")) # Version Noir & Blanc

if __name__ == "__main__":
    main()