import React from 'react';

interface StrategicInputsProps {
  jobChallenge: string;
  setJobChallenge: (value: string) => void;
  likelyObjection: string;
  setLikelyObjection: (value: string) => void;
  strongProof: string;
  setStrongProof: (value: string) => void;
  desiredStyle: string;
  setDesiredStyle: (value: string) => void;
}

const jobChallengeOptions = [
  "Structurer une équipe",
  "Développer le chiffre d’affaires",
  "Remplacer un départ clé",
  "Accélérer une transformation digitale",
  "Sécuriser un projet stratégique",
  "Améliorer la relation client",
  "Ouvrir un nouveau marché",
];

const likelyObjectionOptions = [
  "Profil trop senior pour le poste",
  "Profil pas assez senior",
  "Profil en reconversion",
  "Manque d'expérience dans le secteur",
  "Trou dans le CV",
  "Changements de poste fréquents",
  "Manque d'un diplôme spécifique",
  "Profil atypique",
];

const desiredStyleOptions = ["Sobre", "Énergique", "Dirigeant", "Humain", "Offensif"];

const StrategicInputs: React.FC<StrategicInputsProps> = ({
  jobChallenge,
  setJobChallenge,
  likelyObjection,
  setLikelyObjection,
  strongProof,
  setStrongProof,
  desiredStyle,
  setDesiredStyle,
}) => {
  return (
    <div className="strategic-inputs-section">
      <h3>Paramètres Stratégiques du Pitch</h3>
      <p>Ces champs sont cruciaux pour permettre à l'IA de générer des pitchs réellement adaptés et percutants.</p>

      <div className="form-group">
        <label htmlFor="jobChallenge">Quel est l'enjeu principal du poste ?</label>
        <select
          id="jobChallenge"
          value={jobChallenge}
          onChange={(e) => setJobChallenge(e.target.value)}
          className="form-control"
        >
          <option value="">Sélectionnez ou saisissez un enjeu...</option>
          {jobChallengeOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <input
          type="text"
          placeholder="Ou saisissez un enjeu personnalisé ici"
          value={jobChallenge}
          onChange={(e) => setJobChallenge(e.target.value)}
          className="form-control mt-2"
        />
      </div>

      <div className="form-group">
        <label htmlFor="likelyObjection">Quelle objection un recruteur pourrait-il avoir ?</label>
        <select
          id="likelyObjection"
          value={likelyObjection}
          onChange={(e) => setLikelyObjection(e.target.value)}
          className="form-control"
        >
          <option value="">Sélectionnez ou saisissez une objection...</option>
          {likelyObjectionOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <input
          type="text"
          placeholder="Ou saisissez une objection personnalisée"
          value={likelyObjection}
          onChange={(e) => setLikelyObjection(e.target.value)}
          className="form-control mt-2"
        />
      </div>

      <div className="form-group">
        <label htmlFor="strongProof">Quel résultat concret prouve le mieux votre valeur ?</label>
        <textarea
          id="strongProof"
          placeholder="Ex: J'ai piloté un budget de 2M€ et réduit les coûts de 15% en 6 mois."
          value={strongProof}
          onChange={(e) => setStrongProof(e.target.value)}
          className="form-control"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="desiredStyle">Quel style de pitch souhaitez-vous ?</label>
        <select
          id="desiredStyle"
          value={desiredStyle}
          onChange={(e) => setDesiredStyle(e.target.value)}
          className="form-control"
        >
          <option value="">Sélectionnez un style...</option>
          {desiredStyleOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
    </div>
  );
};

export default StrategicInputs;