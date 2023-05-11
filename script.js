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
const formBtnSave = document.querySelector('.form__button--save');
const formBtnCancel = document.querySelector('.form__button--cancel');
const formBtnUpdate = document.querySelector('.form__button--update');

const inputSort = document.querySelector('.form__input--sort');
const popupDeleteBtnYes = document.querySelector('.popup__delete--option-yes');
const popupDeleteBtnNo = document.querySelector('.popup__delete--option-no');
const popupDeleteAllBtnYes = document.querySelector(
  '.popup__delete--all-option-yes'
);
const popupDeleteAllBtnNo = document.querySelector(
  '.popup__delete--all-option-no'
);
// const popupDeleteAllBtnYes = document.querySelector(
//   '.popup__delete--all > .popup__delete--options > .popup__delete--option-yes'
// );

// Functionality of the app, besides workout object

class App {
  #map; // the whole map
  #mapEvent; // where the user clicked on the map
  #mapZoomLevel = 11;
  #workouts = [];
  #workoutTargetEl;
  editingWorkout;

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    this._showWorkoutsOptions();

    form.addEventListener('submit', this._addWorkout.bind(this));
    formBtnCancel.addEventListener('click', this._hideForm.bind(this));
    formBtnSave.addEventListener('click', this._addWorkout.bind(this));
    formBtnUpdate.addEventListener('click', this._addWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    document.addEventListener('click', this._editWorkout.bind(this));
    document.addEventListener('click', this._viewWorkout.bind(this));
    document.addEventListener('click', this._removeWorkout.bind(this));

    inputSort.addEventListener('change', this._sortWorkouts.bind(this));
    document.addEventListener('click', this._viewAllWorkouts.bind(this));
    document.addEventListener('click', this._removeAllWorkouts.bind(this));

    popupDeleteBtnYes.addEventListener(
      'click',
      this._removeWorkoutYes.bind(this)
    );
    popupDeleteBtnNo.addEventListener(
      'click',
      this._hidePopupDelete.bind(this)
    );

    popupDeleteAllBtnYes.addEventListener(
      'click',
      this._removeWorkoutAllYes.bind(this)
    );
    popupDeleteAllBtnNo.addEventListener(
      'click',
      this._hidePopupDeleteAll.bind(this)
    );
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

    html += `
        <div class="workout__options">
          <div class="workout__option workout__option--delete">
            <span class="workout__option--value">Delete</span>
          </div>
          <div class="workout__option workout__option--view">
            <span class="workout__option--value">View</span>
          </div>
          <div class="workout__option workout__option--edit">
            <span class="workout__option--value">Edit</span>
          </div>
        </div>
      </li>
      `;

    formButtons.insertAdjacentHTML('afterend', html);
  }

  // Workout options

  _editWorkout(e) {
    if (e.target.closest('.workout__option--edit')) {
      const workoutEl = e.target.closest('.workout');
      const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);
      this.editingWorkout = workout;

      // console.log(workout);
      // console.log(this.editingWorkout);

      this._showForm(e);

      inputType.value = workout.type;
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      if (inputType.value === 'running') {
        this._showInputCadence();
        this._hideinputElevation();

        inputCadence.value = workout.cadence;
      }
      if (inputType.value === 'cycling') {
        this._hideInputCadence();
        this._showInputElevation();

        inputElevation.value = workout.elevationGain;
      }

      this._showUpdateButton();

      form.scrollIntoView({ behavior: 'smooth' });
    }
  }

  _removeWorkout(e) {
    // const workoutEl = e.target.closest('.workout');

    this.#workoutTargetEl = e.target.closest('.workout');

    const deleteBtnEl = e.target.closest('.workout__option--delete');

    if (deleteBtnEl) {
      this._showPopupDelete();

      // const dialogText = 'Are you sure you want to delete this workout?';

      // if (confirm(dialogText) == true) {
      //   this.#workouts.splice(workoutIndex, 1);
      //   this._setLocalStorage();
      //   this._refresh();
      // }
    }
  }

  _viewWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    const viewBtnEl = e.target.closest('.workout__option--view');

    if (viewBtnEl) {
      const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);

      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });

      // Public interface

      // won't work because of localStorage object
      workout.click();
      console.log(`${workout.id} has been clicked ${workout.clicks} times.`);
      this._setLocalStorage();
    }
  }

  // Form

  _showForm(e) {
    inputType.value = 'running';
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.classList.remove('hidden');
    formButtons.classList.remove('hidden');

    this._showSaveButton();
    this._showInputCadence();
    this._hideinputElevation();

    if (typeof e.target.closest === 'undefined') {
      inputDistance.focus();
    }

    this.#mapEvent = e;
  }

  _hideForm() {
    // Clear input fields

    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Hide form

    form.style.display = 'none';

    form.classList.add('hidden');
    formButtons.classList.add('hidden');

    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // Update or create new workout

  _addWorkout(e) {
    // console.log(e);
    // console.log(this);
    // console.log(editingWorkoutt);
    // console.log(this.editingWorkout);
    // console.log(kuj);

    e.preventDefault();

    const editingWorkout = this.editingWorkout;

    if (!editingWorkout) {
      console.log('Not editing workout');
    }
    if (editingWorkout) {
      console.log('Editing workout');
    }

    // Helper methods

    const validateIsNumber = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const validateIsPositive = (...inputs) => inputs.every(input => input > 0);

    // Get data from form

    let workout;
    let lat, lng;

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (!editingWorkout) {
      lat = this.#mapEvent.latlng.lat;
      lng = this.#mapEvent.latlng.lng;
    }

    // If workout is running, create a Running object

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validateIsNumber(distance, duration, cadence) ||
        !validateIsPositive(distance, duration, cadence)
      )
        return alert(`Please enter a positive number value`);

      if (!editingWorkout) {
        workout = new Running([lat, lng], distance, duration, cadence);
      }
      if (editingWorkout) {
        editingWorkout.type = type;
        editingWorkout.distance = distance;
        editingWorkout.duration = duration;
        editingWorkout.cadence = cadence;

        editingWorkout.pace = editingWorkout.duration / editingWorkout.distance;
      }
    }

    // If workout is cycling, create a Cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validateIsNumber(distance, duration, elevation) ||
        !validateIsPositive(distance, duration)
      )
        return alert(`Please enter a positive number value`);

      if (!editingWorkout) {
        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      if (editingWorkout) {
        editingWorkout.type = type;
        editingWorkout.distance = distance;
        editingWorkout.duration = duration;
        editingWorkout.elevationGain = elevation;

        editingWorkout.speed =
          editingWorkout.distance / (editingWorkout.duration / 60);
      }
    }

    // Add workout to workouts array

    if (!editingWorkout) {
      this.#workouts.push(workout);
    }

    // Set local storage

    this._setLocalStorage();

    // Render workout in list

    if (!editingWorkout) {
      this._renderWorkoutList(workout);
    }

    // Render workout marker on map

    if (!editingWorkout) {
      this._renderWorkoutMarker(workout);
    }

    // Hide form, clear input fields

    this._hideForm();

    if (editingWorkout) {
      document.querySelectorAll('.workout').forEach(w => w.remove());
      this.#workouts.forEach(w => this._renderWorkoutList(w));
    }

    this.editingWorkout = undefined;
  }

  // Workouts options

  _showWorkoutsOptions() {
    if (this.#workouts === []) return;

    document.querySelector('.workouts__options').classList.remove('hidden');
  }

  _removeAllWorkouts(e) {
    const deleteAllBtnEl = e.target.closest('.workouts__option--delete-all');

    if (deleteAllBtnEl) {
      this._showPopupDeleteAll();

      /*
      const dialogText =
        'Are you sure you want to delete all of your workouts?';

      if (confirm(dialogText) == true) {
        localStorage.removeItem('workouts');
        location.reload();
      }
      */
    }
  }

  _viewAllWorkouts(e) {
    const viewAllBtnEl = e.target.closest('.workouts__option--view-all');

    if (viewAllBtnEl) {
      let markers = [];
      this.#workouts.forEach(w => {
        const marker = L.marker(w.coords);
        markers.push(marker);
      });
      console.log(markers);

      const group = new L.featureGroup(markers);
      this.#map.fitBounds(group.getBounds());
    }
  }

  _sortWorkouts() {
    if (inputSort.value === 'date-added') {
      console.log('Sort by: Date Added');

      document.querySelectorAll('.workout').forEach(w => w.remove());
      const sortedWorkout = this.#workouts.slice().sort((a, b) => a.id - b.id);
      sortedWorkout.forEach(workout => this._renderWorkoutList(workout));
    }
    if (inputSort.value === 'date-added-reverse') {
      console.log('Sort by: Date Added (Reverse)');

      document.querySelectorAll('.workout').forEach(w => w.remove());
      const sortedWorkout = this.#workouts.slice().sort((a, b) => b.id - a.id);
      sortedWorkout.forEach(workout => this._renderWorkoutList(workout));
    }
    if (inputSort.value === 'distance') {
      console.log('Sort by: Distance');

      document.querySelectorAll('.workout').forEach(w => w.remove());
      const sortedWorkout = this.#workouts
        .slice()
        .sort((a, b) => a.distance - b.distance);
      sortedWorkout.forEach(workout => this._renderWorkoutList(workout));
    }
    if (inputSort.value === 'duration') {
      console.log('Sort by: Duration');

      document.querySelectorAll('.workout').forEach(w => w.remove());
      const sortedWorkout = this.#workouts
        .slice()
        .sort((a, b) => a.duration - b.duration);
      sortedWorkout.forEach(workout => this._renderWorkoutList(workout));
    }
  }

  // Storage

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return; // if no data found in localStorage, then restore nothing

    this.#workouts = data;

    const workoutRunning = new Running([40, 40], 0, 0, 0);
    const workoutCycling = new Cycling([40, 40], 0, 0, 0);

    data.forEach(w => {
      if (w.type === 'running') {
        w.__proto__ = workoutRunning.__proto__;
      }

      if (w.type === 'cycling') {
        w.__proto__ = workoutCycling.__proto__;
      }
    });

    //

    this.#workouts.forEach(workout => this._renderWorkoutList(workout));

    console.log(data);

    /*
    data.forEach(w => {
      if (w.type === 'running') {
        const workout = new Running(w);
        this.#workouts.push(workout);
      }

      if (w.type === 'cycling') {
        const workout = new Cycling(w);
        this.#workouts.push(workout);
      }

      // console.log(workout instanceof Workout);
    });
    console.log(this.#workouts);
    */
  }

  // Helper functions

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('hidden');
    inputElevation.closest('.form__row').classList.toggle('hidden');
  }

  _showInputCadence() {
    inputCadence.closest('.form__row').classList.remove('hidden');
  }

  _hideInputCadence() {
    inputCadence.closest('.form__row').classList.add('hidden');
  }

  _showInputElevation() {
    inputElevation.closest('.form__row').classList.remove('hidden');
  }

  _hideinputElevation() {
    inputElevation.closest('.form__row').classList.add('hidden');
  }

  _showSaveButton() {
    formBtnSave.classList.remove('hidden');
    formBtnUpdate.classList.add('hidden');
  }

  _showUpdateButton() {
    formBtnSave.classList.add('hidden');
    formBtnUpdate.classList.remove('hidden');
  }

  _showPopupDelete() {
    document.querySelector('.overlay').classList.remove('hidden');
    document.querySelector('.popup__delete').classList.remove('hidden');
  }

  _hidePopupDelete() {
    document.querySelector('.overlay').classList.add('hidden');
    document.querySelector('.popup__delete').classList.add('hidden');
  }

  _showPopupDeleteAll() {
    document.querySelector('.overlay').classList.remove('hidden');
    document.querySelector('.popup__delete--all').classList.remove('hidden');
  }

  _hidePopupDeleteAll() {
    document.querySelector('.overlay').classList.add('hidden');
    document.querySelector('.popup__delete--all').classList.add('hidden');
  }

  _removeWorkoutYes() {
    this._hidePopupDelete();

    const workoutIndex = this.#workouts.findIndex(
      w => w.id === this.#workoutTargetEl.dataset.id
    );

    this.#workouts.splice(workoutIndex, 1);
    this._setLocalStorage();
    this._refresh();

    this.#workoutTargetEl = undefined;
  }

  _removeWorkoutAllYes() {
    this._hidePopupDeleteAll();

    localStorage.removeItem('workouts');
    location.reload();
  }

  _refresh() {
    location.reload();
  }

  /*
  _fixObj() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    this.#workouts = data;
    this.#workouts.pop(9);

    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  */
}

const app = new App();
