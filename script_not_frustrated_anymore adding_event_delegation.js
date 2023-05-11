'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance; // min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // km/h (not min)
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const workoutsList = document.querySelector('ul');
const formButtons = document.querySelector('.form__buttons');
const formButtonCancel = document.querySelector('.form__button--cancel');
const formButtonSave = document.querySelector('.form__button--save');

// functionality of the app, besides workout object

class App {
  #map; // the whole map
  #mapEvent; // where the user clicked on the map
  #mapZoomLevel = 11;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    this._renderWorkoutsOptions();
    this._showWorkoutsOptions();

    form.addEventListener('submit', this._newWorkout.bind(this));
    formButtonSave.addEventListener('click', this._newWorkout.bind(this));
    formButtonCancel.addEventListener(
      'click',
      this._hideForm.bind(this, form, formButtons)
    );
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this._showWorkoutOptions.bind(this)
    );

    // using event delegation

    document.addEventListener('click', this._moveToPopup.bind(this));
    document.addEventListener('click', this._editWorkout.bind(this));

    document.addEventListener('click', this._removeFormEdit.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Error while getting user coordinates!');
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    // Render map
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Default marker
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: 'default-popup',
        })
      )
      .setPopupContent('Current location')
      .openPopup();

    // Load map markers
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));

    // Map click
    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(e) {
    formMain.classList.remove('hidden');
    formButtons.classList.remove('hidden');

    inputDistance.focus();

    this.#mapEvent = e;
  }

  _hideForm(formMain, formButtons) {
    // Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Hide form
    form.style.display = 'none';

    // form.classList.add('hidden');
    // formButtons.classList.add('hidden');

    formMain.classList.add('hidden');
    formButtons.classList.add('hidden');

    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // helper methods

    const validateIsNumber = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const validateIsPositive = (...inputs) => inputs.every(input => input > 0);

    // Get data from form

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create a Running object

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validateIsNumber(distance, duration, cadence) ||
        !validateIsPositive(distance, duration, cadence)
      )
        return alert(`Please enter a positive number value`);

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create a Cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validateIsNumber(distance, duration, elevation) ||
        !validateIsPositive(distance, duration)
      )
        return alert(`Please enter a positive number value`);

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add workout to workouts array

    this.#workouts.push(workout);

    // Render workout marker on map

    this._renderWorkoutMarker(workout);

    // Render workout in list

    this._renderWorkoutList(workout);

    // Hide form, clear input fields

    this._hideForm(form, formButtons);

    // Set local storage

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details--main">
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </div>
        `;

    // let htmlWorkoutOptions = `
    html += `
        <div class="workout__options hidden">
          <div class="workout__option workout__option--go-to">
            <span class="workout__option--value">Go To</span>
          </div>
          <div class="workout__option workout__option--delete">
            <span class="workout__option--value">Delete</span>
          </div>
          <div class="workout__option workout__option--edit">
            <span class="workout__option--value">Edit</span>
          </div>
        </div>
        `;

    // <span class="workout__option--icon">🚩</span>
    // <span class="workout__option--icon">🗑️</span>
    // <span class="workout__option--icon">✏️</span>

    // formButtons.insertAdjacentHTML('afterend', htmlWorkoutOptions);
    formButtons.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutsOptions() {
    const options = `
      <li class="workouts__options hidden">
        <div class="workouts__option workouts__option--delete-all">
          <span class="workouts__option--value">Delete All</span>
        </div>
        <div class="workouts__option workouts__option--sort">
          <label class="form__label">Sort by</label>
          <select class="form__input form__input--type">
              <option value="running">Date Added</option>
              <option value="running">Date Added (Reverse)</option>
              <option value="cycling">Distance</option>
              <option value="cycling">Duration</option>
          </select>
        </div>
      </li>
      `;

    // <span class="workouts__option--value">Sort</span>
    // <span class="workouts__option--icon">🗑️</span>
    // <span class="workouts__option--icon">🔤</span>

    workoutsList.insertAdjacentHTML('beforeend', options);
  }

  _moveToPopup(e) {
    if (e.target.closest('.workout__option--go-to')) {
      const el = e.target.closest('.workout');

      const workout = this.#workouts.find(w => w.id === el.dataset.id);

      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
    // const el = e.target.closest('.workout__option');
    // if (!theWorkout) return;
    // if (e.target && el) {
    // }

    // Public interface

    // won't work because of localStorage object
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => this._renderWorkoutList(workout));
  }

  _removeWorkouts() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  //

  _showWorkoutOptions(e) {
    if (e.target.closest('.workout')) {
      const workout = e.target.closest('.workout');

      // if (!workout) return;

      // Hide options of previously clicked workout

      const workoutOptionsElAll =
        document.querySelectorAll('.workout__options');
      const workoutOptionsEl = workout.querySelector('.workout__options');
      const workoutOptionsElArr = Array.from(
        workout.querySelector('.workout__options').classList
      );

      workoutOptionsElAll.forEach(w => w.classList.add('hidden'));
      // workoutOptionsEl.classList.remove('hidden');

      if (workoutOptionsElArr.includes('hidden')) {
        workoutOptionsEl.classList.remove('hidden');
      }

      this._workoutOptionsActions(workoutOptionsEl);
    }

    // workoutElAll.forEach(w => {
    //   if (w.dataset.id !== workoutOptionsEl.dataset.id) {
    //     w.classList.add('hidden');
    //   }
    //   if (w.dataset.id === workoutOptionsEl.dataset.id) {
    //     w.classList.remove('hidden');
    //   }

    // console.log(w, workoutOptionsEl);
    // }
    // );

    // Show workout options

    // const workoutOptionsEl = workout.querySelector('.workout__options');
    // workoutOptionsEl.classList.toggle('hidden');

    // console.log(workoutOptionsEl.classList);
    // if (Array.from(workoutOptionsEl.classList).includes('hidden')) {
    //   workoutOptionsEl.classList.remove('hidden');
    //   console.log('removed hidden class');
    //   return;
    // }
    // if (!Array.from(workoutOptionsEl.classList).includes('hidden')) {
    //   workoutOptionsEl.classList.add('hidden');
    //   console.log('added hidden class');
    //   return;
    // }

    // console.log(workoutOptionsEl);
  }

  _workoutOptionsActions(workoutOptionsEl) {
    // const buttonGoTo = workoutOptionsEl.querySelector(
    //   '.workout__option--go-to'
    // );
    const buttonDelete = workoutOptionsEl.querySelector(
      '.workout__option--delete'
    );
    // const buttonEdit = workoutOptionsEl.querySelector('.workout__option--edit');

    // buttonGoTo.addEventListener('click', this._moveToPopup.bind(this));
    buttonDelete.addEventListener('click', this._removeWorkout.bind(this));
    // buttonEdit.addEventListener('click', this._editWorkout.bind(this));
  }

  _showWorkoutsOptions() {
    if (this.#workouts === []) return;

    document.querySelector('.workouts__options').classList.remove('hidden');
  }

  _removeWorkout(e) {
    // const workout =
    //   e.target.closest('.workout__options').previousElementSibling;

    const theWorkout = e.target.closest('.workout');

    if (!theWorkout) return;

    //

    const workoutIndex = this.#workouts.findIndex(
      w => w.id === theWorkout.dataset.id
    );

    this.#workouts.splice(workoutIndex, 1);
    this._setLocalStorage();
    this._refresh();
  }

  _refresh() {
    location.reload();
  }

  // _showForm(e) {
  //   form.classList.remove('hidden');
  //   formButtons.classList.remove('hidden');

  //   inputDistance.focus();

  //   this.#mapEvent = e;
  // }

  _removeFormEdit(e) {
    if (e.target.closest('.form__button--cancel')) {
      document.querySelector('.form__edit').remove();
      document.querySelector('.form__edit--buttons').remove();
    }
  }

  _editWorkout(e) {
    if (e.target.closest('.workout__option--edit')) {
      const el = e.target.closest('.workout');

      const workout = this.#workouts.find(w => w.id === el.dataset.id);
      // const workout = this.#workouts.filter(
      //   w => w.id === theWorkout.dataset.id
      // )[0];

      // const theWorkout = e.target.closest('.workout');

      console.log(workout);

      let html = `
        <form class="form__edit hidden">
          <div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input form__input--type">
              <option value="running">Running</option>
              <option value="cycling">Cycling</option>
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="form__input form__input--distance" placeholder="${
              workout.distance
            } km" />
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              class="form__input form__input--duration"
              placeholder="min"
            />
          </div>
          <div class="form__row">
            <label class="form__label">${
              workout.type === 'running' ? 'Cadence' : 'Elev Gain'
            }</label>
            <input
              class="form__input form__input--${
                workout.type === 'running' ? 'cadence' : 'elevation'
              }"
              placeholder="${
                workout.type === 'running' ? 'step/min' : 'meters'
              }"
            />
          </div>
        </form>
        <div class="form__edit--buttons hidden">
          <div class="form__button form__button--cancel">
            <span>Cancel</span>
          </div>
          <div class="form__button form__button--save">
            <span>Update</span>
          </div>
        </div>
        `;

      // <div class="form__row form__row--hidden">
      //   <label class="form__label">Elev Gain</label>
      //   <input
      //     class="form__input form__input--elevation"
      //     placeholder="meters"
      //   />
      // </div>

      form.insertAdjacentHTML('beforebegin', html);

      // Form and buttons

      const formEdit = document.querySelector('.form__edit');
      const formEditButtons = document.querySelector('.form__edit--buttons');
      const formEditButtonCancel = formEditButtons.querySelector(
        '.form__button--cancel'
      );
      const formEditButtonSave = formEditButtons.querySelector(
        '.form__button--save'
      );

      // Show form and buttons

      formEdit.classList.remove('hidden');
      formEditButtons.classList.remove('hidden');

      // Form button actions

      // formEditButtonCancel.addEventListener('click', this._removeFormEdit);
      // formEditButtonSave.addEventListener('click', this._removeFormEdit);

      // Fill form values from workout object

      document.querySelector('.form__input--distance').value = workout.distance;
      document.querySelector('.form__input--duration').value = workout.duration;
      if (workout.type === 'running') {
        document.querySelector('.form__input--cadence').value = workout.cadence;
      }
      if (workout.type === 'cycling') {
        document.querySelector('.form__input--elevation').value =
          workout.elevationGain;
      }
      // document.querySelector().setAttribute('selected', 'selected');

      // formButtonSave.addEventListener('click', this._newWorkout.bind(this));

      // this._hideForm(formEdit, formEditButtons);

      // console.log(this.#workouts);
      // console.log(this.#workouts[7].id);
      // console.log(theWorkout.dataset.id);
      // console.log(theWorkout);
      // console.log(workout);
    }
  }
}

const app = new App();
