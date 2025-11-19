// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Product Satisfaction Survey Contract using FHE
/// @notice An anonymous product satisfaction comparison system where users rate products (1-5) using encrypted scores
/// @dev Scores are encrypted on-chain and only the admin can decrypt the final sum to calculate averages
contract ProductSatisfactionSurvey is SepoliaConfig {
    struct Survey {
        string title;
        string description;
        string[] productNames; // Product A, B, C, etc.
        uint256 productCount;
        uint256 endTime;
        bool isActive;
        bool isFinalized;
        mapping(uint256 => euint32) encryptedSums; // productIndex => encrypted sum of scores
        address admin;
        uint256 totalResponses;
        mapping(uint256 => uint32) decryptedSums; // productIndex => decrypted sum (after finalization)
    }

    Survey[] public surveys;
    
    // Mapping: surveyId => user => hasSubmitted
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    // Mapping: requestId => (surveyId, productIndex) for decryption callbacks
    mapping(uint256 => uint256) private _requestToSurvey;
    mapping(uint256 => uint256) private _requestToProductIndex;
    
    // Events
    event SurveyCreated(uint256 indexed surveyId, string title, address indexed admin);
    event RatingSubmitted(uint256 indexed surveyId, address indexed user);
    event SurveyEnded(uint256 indexed surveyId);
    event FinalizeRequested(uint256 indexed surveyId, uint256 requestId);
    event SurveyFinalized(uint256 indexed surveyId, uint256 productIndex, uint256 decryptedSum);

    modifier onlyAdmin(uint256 _surveyId) {
        require(surveys[_surveyId].admin == msg.sender, "Only admin can perform this action");
        _;
    }

    modifier surveyExists(uint256 _surveyId) {
        require(_surveyId < surveys.length, "Survey does not exist");
        _;
    }

    modifier surveyActive(uint256 _surveyId) {
        require(surveys[_surveyId].isActive, "Survey is not active");
        require(block.timestamp < surveys[_surveyId].endTime, "Survey has ended");
        require(!surveys[_surveyId].isFinalized, "Survey is finalized");
        _;
    }

    /// @notice Create a new survey
    /// @param _title The title of the survey
    /// @param _description The description of the survey
    /// @param _productNames Array of product names (A, B, C, etc.)
    /// @param _durationInHours Duration of the survey in hours
    function createSurvey(
        string memory _title,
        string memory _description,
        string[] memory _productNames,
        uint256 _durationInHours
    ) external returns (uint256) {
        require(_productNames.length >= 2, "Must have at least 2 products");
        require(_productNames.length <= 5, "Cannot have more than 5 products");
        require(_durationInHours > 0, "Duration must be greater than 0");

        uint256 surveyId = surveys.length;
        
        Survey storage newSurvey = surveys.push();
        newSurvey.title = _title;
        newSurvey.description = _description;
        newSurvey.productCount = _productNames.length;
        newSurvey.productNames = _productNames;
        newSurvey.endTime = block.timestamp + (_durationInHours * 1 hours);
        newSurvey.isActive = true;
        newSurvey.isFinalized = false;
        newSurvey.admin = msg.sender;
        newSurvey.totalResponses = 0;

        emit SurveyCreated(surveyId, _title, msg.sender);
        
        return surveyId;
    }

    /// @notice Submit encrypted ratings for all products
    /// @param _surveyId The ID of the survey
    /// @param _encryptedRatings Array of encrypted ratings (1-5) for each product
    /// @param inputProofs Array of proofs for each encrypted input
    /// @dev Users encrypt their ratings (1-5) for each product before submission
    function submitRatings(
        uint256 _surveyId,
        externalEuint32[] calldata _encryptedRatings,
        bytes[] calldata inputProofs
    ) external surveyExists(_surveyId) surveyActive(_surveyId) {
        require(!hasSubmitted[_surveyId][msg.sender], "Already submitted ratings for this survey");
        Survey storage survey = surveys[_surveyId];
        require(_encryptedRatings.length == survey.productCount, "Number of ratings must match product count");
        require(inputProofs.length == survey.productCount, "Number of proofs must match product count");

        // Process each product rating
        for (uint256 i = 0; i < survey.productCount; i++) {
            // Convert external encrypted input to internal euint32
            euint32 encryptedRating = FHE.fromExternal(_encryptedRatings[i], inputProofs[i]);
            
            // Add the encrypted rating to the sum for this product
            if (survey.totalResponses == 0) {
                survey.encryptedSums[i] = encryptedRating;
            } else {
                survey.encryptedSums[i] = FHE.add(survey.encryptedSums[i], encryptedRating);
            }
            
            // Grant permissions
            FHE.allowThis(survey.encryptedSums[i]);
            FHE.allow(survey.encryptedSums[i], survey.admin);
        }
        
        // Mark as submitted
        hasSubmitted[_surveyId][msg.sender] = true;
        survey.totalResponses++;
        
        emit RatingSubmitted(_surveyId, msg.sender);
    }

    /// @notice Get the encrypted sum for a specific product (only admin can decrypt)
    /// @param _surveyId The ID of the survey
    /// @param _productIndex The index of the product
    /// @return The encrypted sum of all ratings for this product
    function getEncryptedSum(
        uint256 _surveyId,
        uint256 _productIndex
    ) external view surveyExists(_surveyId) returns (euint32) {
        require(_productIndex < surveys[_surveyId].productCount, "Invalid product index");
        return surveys[_surveyId].encryptedSums[_productIndex];
    }

    /// @notice End a survey (anyone can call after end time)
    /// @param _surveyId The ID of the survey
    function endSurvey(uint256 _surveyId) external surveyExists(_surveyId) {
        Survey storage survey = surveys[_surveyId];
        require(survey.isActive, "Survey not active");
        require(block.timestamp >= survey.endTime, "Survey has not ended yet");

        survey.isActive = false;
        emit SurveyEnded(_surveyId);
    }

    /// @notice Request decryption for a specific product and publish clear results
    /// @param _surveyId The ID of the survey
    /// @param _productIndex The index of the product to decrypt
    function finalizeProduct(uint256 _surveyId, uint256 _productIndex) external surveyExists(_surveyId) {
        Survey storage survey = surveys[_surveyId];
        require(!survey.isActive, "Survey still active");
        require(_productIndex < survey.productCount, "Invalid product index");
        require(survey.decryptedSums[_productIndex] == 0, "Product already finalized");

        // Request decryption for the encrypted sum
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(survey.encryptedSums[_productIndex]);

        uint256 requestId = FHE.requestDecryption(cts, this.decryptionCallback.selector);
        _requestToSurvey[requestId] = _surveyId;
        _requestToProductIndex[requestId] = _productIndex;
        emit FinalizeRequested(_surveyId, requestId);
    }

    /// @notice Callback called by the FHE decryption oracle
    /// @dev Expects the decrypted sum in bytes
    function decryptionCallback(uint256 requestId, bytes memory cleartexts, bytes[] memory /*signatures*/) public returns (bool) {
        uint256 surveyId = _requestToSurvey[requestId];
        uint256 productIndex = _requestToProductIndex[requestId];
        Survey storage survey = surveys[surveyId];
        require(survey.decryptedSums[productIndex] == 0, "Product already finalized");
        require(!survey.isActive, "Survey still active");

        // Parse the decrypted sum (uint32)
        require(cleartexts.length >= 4, "Invalid cleartexts length");
        uint32 decryptedSum;
        assembly {
            // Read 4 bytes starting at offset 32 (skip bytes length slot)
            decryptedSum := shr(224, mload(add(cleartexts, 32)))
        }

        // Store the decrypted sum
        survey.decryptedSums[productIndex] = decryptedSum;

        emit SurveyFinalized(surveyId, productIndex, decryptedSum);
        return true;
    }

    /// @notice Check if all products are finalized
    /// @param _surveyId The ID of the survey
    function isSurveyFullyFinalized(uint256 _surveyId) external view surveyExists(_surveyId) returns (bool) {
        Survey storage survey = surveys[_surveyId];
        for (uint256 i = 0; i < survey.productCount; i++) {
            if (survey.decryptedSums[i] == 0) {
                return false;
            }
        }
        return true;
    }

    /// @notice Mark survey as fully finalized (only after all products are decrypted)
    /// @param _surveyId The ID of the survey
    function markSurveyFullyFinalized(uint256 _surveyId) external surveyExists(_surveyId) onlyAdmin(_surveyId) {
        Survey storage survey = surveys[_surveyId];
        require(!survey.isFinalized, "Survey already finalized");
        require(this.isSurveyFullyFinalized(_surveyId), "Not all products are finalized");
        
        survey.isFinalized = true;
    }

    /// @notice Get the decrypted sum for a specific product (only available after finalization)
    /// @param _surveyId The ID of the survey
    /// @param _productIndex The index of the product
    function getDecryptedSum(uint256 _surveyId, uint256 _productIndex) external view surveyExists(_surveyId) returns (uint32) {
        require(_productIndex < surveys[_surveyId].productCount, "Invalid product index");
        uint32 sum = surveys[_surveyId].decryptedSums[_productIndex];
        require(sum > 0, "Product not finalized yet");
        return sum;
    }

    /// @notice Get survey details
    /// @param _surveyId The ID of the survey
    function getSurvey(
        uint256 _surveyId
    ) external view surveyExists(_surveyId) returns (
        string memory title,
        string memory description,
        uint256 productCount,
        string[] memory productNames,
        uint256 endTime,
        bool isActive,
        bool isFinalized,
        address admin,
        uint256 totalResponses
    ) {
        Survey storage survey = surveys[_surveyId];
        return (
            survey.title,
            survey.description,
            survey.productCount,
            survey.productNames,
            survey.endTime,
            survey.isActive,
            survey.isFinalized,
            survey.admin,
            survey.totalResponses
        );
    }

    /// @notice Get total number of surveys
    function getSurveyCount() external view returns (uint256) {
        return surveys.length;
    }

    /// @notice Check if a user has submitted ratings for a survey
    function hasUserSubmitted(uint256 _surveyId, address _user) external view returns (bool) {
        return hasSubmitted[_surveyId][_user];
    }
}

