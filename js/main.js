/**
 * CV Generator App
 * Inspired by this video https://youtu.be/kNbw9UxaAsI
 * @author @cris_dpa
 * Copyright © 2022 Christopher Díaz Pantoja
 */

const EXPERIENCE_ENTITY = {
	id: "",
	company: "",
	time: "",
	year: "",
	position: "",
	description: "",
};

const KNOWLEDGE_ENTITY = {
	id: "",
	name: "",
	level: "",
};

const PROJECT_ENTITY = {
	id: "",
	name: "",
	url: "",
	repository: "",
	description: "",
};

const LANGUAGE_PROFICIENCY_ENTITY = {
	id: "",
	lang: "",
	level: "native",
};

const MODULES_MAP = {
	experience: "EXPERIENCE_ENTITY",
	knowledge: "KNOWLEDGE_ENTITY",
	projects: "PROJECT_ENTITY",
	languageProficiency: "LANGUAGE_PROFICIENCY_ENTITY",
};

const KNOWLEDGE_LEVELS = [
	{ value: "", name: "No aplica" },
	{ value: "basic", name: "Básico" },
	{ value: "intermediate", name: "Intermedio" },
	{ value: "advanced", name: "Avanzado" },
	{ value: "expert", name: "Experto" },
];

const LANGUAGE_PROFICIENCY_LEVELS = [
	{ value: "native", name: "Nativo" },
	{ value: "basic", name: "Básico" },
	{ value: "intermediate", name: "Intermedio" },
	{ value: "advanced", name: "Avanzado" },
];

const ERROR_MESSAGES = {
	GENERAL: "Tenemos un problema para generar el CV",
	DOWNLOAD_UNAVAILABLE:
		"La descarga no está disponible en este momento, inténtalo más tarde.",
	CORRUPT_SENT_DATA: "Al parecer los datos enviados tienen un problema",
};

const I10N = {
	es: {
		cv: {
			experience: "Experiencia",
			knowledge: "Conocimientos",
			languageProficiency: "Idiomas",
			projects: "Proyectos",
			knowledgeLevels: {
				basic: "Básico",
				intermediate: "Intermedio",
				advanced: "Avanzado",
				expert: "Experto",
			},
			knowledgeCategories: {
				languages: "Lenguajes",
				frameworks: "Frameworks & Plataformas",
				databases: "Bases de datos",
				infraestructure: "Infraestructura",
				versionsControl: "Control de versiones",
				operatingSystems: "Sistemas operativos",
			},
			languageProficiencyLevels: {
				native: "nativo",
				basic: "básico",
				intermediate: "intermedio",
				advanced: "avanzado",
			},
		},
		poweredBy: "Creado con",
	},
	en: {
		cv: {
			experience: "Experience",
			knowledge: "Knowledge",
			languageProficiency: "Language Proficiency",
			nativeLanguage: "native",
			projects: "Projects",
			knowledgeLevels: {
				basic: "Basic",
				intermediate: "Intermediate",
				advanced: "Advanced",
				expert: "Expert",
			},
			knowledgeCategories: {
				languages: "Languages",
				frameworks: "Frameworks & Platforms",
				databases: "Databases",
				infraestructure: "Infraestructure",
				versionsControl: "Versions Control",
				operatingSystems: "Operating Systems",
			},
			languageProficiencyLevels: {
				native: "native",
				basic: "basic",
				intermediate: "intermediate",
				advanced: "advanced",
			},
		},
		poweredBy: "Powered by",
	},
};

Vue.createApp({
	delimiters: ["[[", "]]"],

	mounted() {
		this.loadDefaultData();
	},

	data() {
		return {
			cv: {
				lang: "es",
				profile: {
					avatar: "",
					fullname: "",
					position: "",
					contact: "",
				},
				experience: [],
				knowledge: {
					languages: [{ ...KNOWLEDGE_ENTITY }],
					frameworks: [{ ...KNOWLEDGE_ENTITY }],
					databases: [{ ...KNOWLEDGE_ENTITY }],
					infraestructure: [{ ...KNOWLEDGE_ENTITY }],
					versionsControl: [{ ...KNOWLEDGE_ENTITY }],
					operatingSystems: [{ ...KNOWLEDGE_ENTITY }],
				},
				languageProficiency: [{ ...LANGUAGE_PROFICIENCY_ENTITY }],
				projects: [],
			},
			knowledgeLevels: KNOWLEDGE_LEVELS,
			languageProficiencyLevels: LANGUAGE_PROFICIENCY_LEVELS,
			message: {
				text: "",
				isVisible: false,
			},
			isDownloading: false,
			isDownloadEnabled: IS_DOWNLOAD_ENABLED,
		};
	},

	computed: {
		avatar() {
			const defaultAvatar = `${STATIC_URL}img/avatar.png`;
			return this.cv.profile.avatar ? this.cv.profile.avatar : defaultAvatar;
		},

		hasExperience() {
			return this.cv.experience.length > 0;
		},

		knowledgeLevelClass() {
			return (level) => {
				return level !== "" ? `knowledge-level knowledge-level--${level}` : "";
			};
		},

		cvLangIsEnglish() {
			return this.cv.lang === "en";
		},

		i10n() {
			return (message) => {
				return I10N[this.cv.lang]
					? this.dotStringToObject(message, I10N[this.cv.lang])
					: message;
			};
		},
	},

	methods: {
		loadDefaultData() {
			if (Object.keys(DEFAULT_CV_DATA).length > 0) {
				this.cv = DEFAULT_CV_DATA;
			}
		},

		addModule(entityName, target) {
			const module = { ...MODULES_MAP[entityName] };
			module.id = this.getRandomID();
			target.push(module);
		},

		removeModule(target, moduleID) {
			const moduleIndex = target.findIndex((item) => item.id === moduleID);
			target.splice(moduleIndex, 1);
		},

		getRandomID() {
			const typedArray = new Uint32Array(2);
			const suggestions = crypto.getRandomValues(typedArray);
			const idNumber = parseInt(suggestions.join(""));
			const idToASCII = idNumber.toString(36);
			return idToASCII;
		},

		toggleLangEnglish() {
			this.cv.lang = this.cv.lang !== "en" ? "en" : "es";
			this.trackEventToAnalytics("toggle_cv_lang");
		},

		dotStringToObject(string, object) {
			return string.split(".").reduce((obj, index) => obj[index], object);
		},

		trackEventToAnalytics(event) {
			gtag("event", event);
		},

		async downloadCV() {
			if (this.isDownloading) {
				return;
			}
			this.isDownloading = true;
			this.trackEventToAnalytics("download_cv");

			const requestParams = {
				body: JSON.stringify(this.cv),
				cache: "no-store",
				headers: { "X-CSRFToken": this.getCookie("csrftoken") },
				method: "POST",
				mode: "cors",
			};

			try {
				const response = await fetch("/", requestParams);

				if (response.status !== 200) {
					return this.handleDownloadError(response.status);
				}

				const json_response = await response.json();
				this.triggerDownloadFile(json_response.cvURL);
			} catch (e) {
				this.showMessage(ERROR_MESSAGES.GENERAL);
			} finally {
				this.isDownloading = false;
			}
		},

		handleDownloadError(statusCode) {
			let message = ERROR_MESSAGES.GENERAL;

			switch (statusCode) {
				case 403:
					message = ERROR_MESSAGES.DOWNLOAD_UNAVAILABLE;
					break;
				case 400:
					message = ERROR_MESSAGES.CORRUPT_SENT_DATA;
					break;
			}

			this.showMessage(message);
		},

		async showMessage(message, show = true) {
			if (show) {
				this.message.text = message;
				this.message.isVisible = true;
				await new Promise((resolve) => {
					setTimeout(() => {
						this.message.isVisible = false;
						resolve();
					}, 5000);
				});
			} else {
				this.message.text = "";
			}
		},

		triggerDownloadFile(url) {
			const anchor = document.createElement("a");
			anchor.style.display = "none";
			anchor.href = url;
			anchor.download = "cv.pdf";
			anchor.click();
			anchor.remove();
		},

		togglePreviewMode() {
			const body = document.querySelector("body");
			body.classList.toggle("body--preview-mode");
			this.trackEventToAnalytics("toggle_preview_mode");
		},

		getCookie(name) {
			let cookieValue = null;
			if (document.cookie && document.cookie !== "") {
				const cookies = document.cookie.split(";");
				for (let i = 0; i < cookies.length; i++) {
					const cookie = cookies[i].trim();
					if (cookie.substring(0, name.length + 1) === name + "=") {
						cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
						break;
					}
				}
			}
			return cookieValue;
		},
	},
}).mount("#app");
